import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMilestone, PaymentType } from "@/db/types";
import { sendInvoiceEmail } from "@/lib/email";
import { normalizeInvoiceBankDetails } from "@/lib/invoices/bank-details";
import { insertInvoiceWithRetry } from "@/lib/invoices/create-invoice";
import { getInvoicePaymentUrl } from "@/lib/invoices/payment-link";
import {
  getMilestoneAmount,
  getScheduleTotal,
  normalizePaymentSchedule,
} from "@/lib/payments/config";

type ContractPaymentRecord = {
  id: string;
  payment_type: PaymentType;
  status: string;
  amount: number;
  metadata: Record<string, unknown> | null;
};

type ContractForPaymentInvoice = {
  id: string;
  title: string;
  user_id: string;
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string | null;
  payment_structure: string | null;
  deposit_percentage: number | null;
  payment_schedule: unknown;
};

export type ContractPaymentStage = {
  paymentType: PaymentType;
  amount: number;
  label: string;
  milestone: (PaymentMilestone & { index: number }) | null;
};

function getPaymentMilestoneId(payment: ContractPaymentRecord): string | null {
  const milestoneId = payment.metadata?.payment_milestone_id;
  return typeof milestoneId === "string" ? milestoneId : null;
}

function paymentMatchesStage(
  payment: ContractPaymentRecord,
  stage: ContractPaymentStage
): boolean {
  if (payment.payment_type !== stage.paymentType) return false;
  if (!stage.milestone) return true;
  return getPaymentMilestoneId(payment) === stage.milestone.id;
}

export function getNextContractPaymentStage(
  contract: ContractForPaymentInvoice,
  payments: ContractPaymentRecord[]
): ContractPaymentStage | null {
  if (
    !contract.payment_required ||
    !contract.payment_amount ||
    contract.payment_amount <= 0 ||
    contract.payment_status === "succeeded"
  ) {
    return null;
  }

  const totalAmount = Math.round(contract.payment_amount * 100);
  const succeeded = payments.filter((payment) => payment.status === "succeeded");

  if (contract.payment_structure === "custom") {
    const schedule = normalizePaymentSchedule(contract.payment_schedule);
    if (schedule.length < 2 || getScheduleTotal(schedule) !== 100) return null;

    const paidMilestoneIds = new Set(
      succeeded
        .filter((payment) => payment.payment_type === "installment")
        .map(getPaymentMilestoneId)
        .filter((id): id is string => Boolean(id))
    );
    const index = schedule.findIndex(
      (milestone) => !paidMilestoneIds.has(milestone.id)
    );
    if (index < 0) return null;

    const milestone = schedule[index];
    return {
      paymentType: "installment",
      amount: getMilestoneAmount(totalAmount, schedule, index),
      label: milestone.label,
      milestone: { ...milestone, index },
    };
  }

  if (contract.payment_structure === "deposit_balance") {
    const depositPaid = succeeded.some(
      (payment) => payment.payment_type === "deposit"
    );
    const balancePaid = succeeded.some(
      (payment) => payment.payment_type === "balance"
    );
    const depositPercentage = contract.deposit_percentage || 30;
    const depositAmount = Math.round(totalAmount * (depositPercentage / 100));

    if (!depositPaid) {
      return {
        paymentType: "deposit",
        amount: depositAmount,
        label: `Deposit (${depositPercentage}%)`,
        milestone: null,
      };
    }
    if (!balancePaid) {
      return {
        paymentType: "balance",
        amount: totalAmount - depositAmount,
        label: "Final balance",
        milestone: null,
      };
    }
    return null;
  }

  if (succeeded.some((payment) => payment.payment_type === "full")) {
    return null;
  }

  return {
    paymentType: "full",
    amount: totalAmount,
    label: "Full payment",
    milestone: null,
  };
}

export async function syncContractPaymentStatus(
  supabase: SupabaseClient,
  contractId: string
): Promise<"pending" | "succeeded"> {
  const [{ data: contract }, { data: successfulPayments }] = await Promise.all([
    supabase
      .from("contracts")
      .select("payment_amount")
      .eq("id", contractId)
      .single(),
    supabase
      .from("payments")
      .select("amount")
      .eq("contract_id", contractId)
      .eq("status", "succeeded"),
  ]);

  const totalDue = Math.round((contract?.payment_amount || 0) * 100);
  const totalPaid = (successfulPayments || []).reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const status = totalDue > 0 && totalPaid >= totalDue ? "succeeded" : "pending";

  await supabase
    .from("contracts")
    .update({ payment_status: status, updated_at: new Date().toISOString() })
    .eq("id", contractId);

  return status;
}

export async function ensureNextContractPaymentInvoice({
  supabase,
  contractId,
  recipientName,
  recipientEmail,
  baseUrl,
  sendEmail = true,
}: {
  supabase: SupabaseClient;
  contractId: string;
  recipientName: string | null;
  recipientEmail: string | null;
  baseUrl?: string;
  sendEmail?: boolean;
}) {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(
      "id, title, user_id, payment_required, payment_amount, payment_currency, payment_status, payment_structure, deposit_percentage, payment_schedule"
    )
    .eq("id", contractId)
    .single<ContractForPaymentInvoice>();

  if (contractError || !contract) {
    throw new Error("Contract not found while creating the next payment invoice");
  }

  const { data: rawPayments, error: paymentsError } = await supabase
    .from("payments")
    .select("id, payment_type, status, amount, metadata")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });
  if (paymentsError) throw paymentsError;

  const payments = (rawPayments || []) as ContractPaymentRecord[];
  const stage = getNextContractPaymentStage(contract, payments);
  if (!stage) return { invoice: null, payment: null, stage: null, created: false };

  let payment = payments.find(
    (candidate) =>
      ["pending", "processing"].includes(candidate.status) &&
      paymentMatchesStage(candidate, stage)
  ) || null;
  let createdPayment = false;

  if (payment) {
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, due_date, line_items")
      .eq("payment_id", payment.id)
      .in("status", ["draft", "sent", "overdue"])
      .maybeSingle();
    if (existingInvoice) {
      return { invoice: existingInvoice, payment, stage, created: false };
    }
  } else {
    const metadata = stage.milestone
      ? {
          contract_title: contract.title,
          payment_milestone_id: stage.milestone.id,
          payment_milestone_index: stage.milestone.index,
          payment_milestone_label: stage.milestone.label,
          payment_milestone_percentage: stage.milestone.percentage,
        }
      : { contract_title: contract.title };
    const { data: insertedPayment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        contract_id: contract.id,
        user_id: contract.user_id,
        amount: stage.amount,
        currency: contract.payment_currency || "usd",
        status: "pending",
        payment_type: stage.paymentType,
        description: `${stage.label} - ${contract.title}`,
        metadata,
      })
      .select("id, payment_type, status, amount, metadata")
      .single<ContractPaymentRecord>();
    if (paymentError || !insertedPayment) {
      throw paymentError || new Error("Failed to create payment stage");
    }
    payment = insertedPayment;
    createdPayment = true;
  }

  const [{ data: owner }, { data: invoiceSettings }] = await Promise.all([
    supabase
      .from("users")
      .select("name, email, company_name")
      .eq("id", contract.user_id)
      .single(),
    supabase
      .from("invoice_settings")
      .select(
        "company_name, company_address, company_logo_url, default_due_days, default_notes, bank_details"
      )
      .eq("user_id", contract.user_id)
      .maybeSingle(),
  ]);
  const bankDetails = normalizeInvoiceBankDetails(invoiceSettings?.bank_details);
  const milestoneDueDate = stage.milestone?.dueDate;
  const dueDate = milestoneDueDate
    ? new Date(`${milestoneDueDate}T23:59:59.999Z`).toISOString()
    : new Date(
        Date.now() +
          (invoiceSettings?.default_due_days ?? 30) * 24 * 60 * 60 * 1000
      ).toISOString();
  const lineItems = [
    {
      description: `${stage.label} - ${contract.title}`,
      quantity: 1,
      unit_price: stage.amount,
      amount: stage.amount,
    },
  ];

  const { data: invoice, error: invoiceError } = await insertInvoiceWithRetry<{
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    due_date: string;
    line_items: Array<{ description: string; quantity: number; amount: number }>;
  }>(supabase, {
    contract_id: contract.id,
    payment_id: payment.id,
    user_id: contract.user_id,
    amount: stage.amount,
    currency: contract.payment_currency || "usd",
    status: "sent",
    line_items: lineItems,
    subtotal: stage.amount,
    tax_amount: 0,
    total: stage.amount,
    due_date: dueDate,
    sent_at: new Date().toISOString(),
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    sender_name: owner?.name || null,
    sender_company: invoiceSettings?.company_name || owner?.company_name || null,
    sender_email: owner?.email || null,
    sender_logo_url: invoiceSettings?.company_logo_url || null,
    sender_address:
      invoiceSettings?.company_address ||
      invoiceSettings?.company_name ||
      owner?.company_name ||
      bankDetails
        ? {
            address: invoiceSettings?.company_address || null,
            company:
              invoiceSettings?.company_name || owner?.company_name || null,
            bank_details: bankDetails,
          }
        : null,
    bank_details: bankDetails,
    notes: invoiceSettings?.default_notes || null,
  });

  if (invoiceError || !invoice) {
    if (createdPayment) {
      await supabase
        .from("payments")
        .delete()
        .eq("id", payment.id)
        .eq("status", "pending");
    }
    throw invoiceError || new Error("Failed to create payment invoice");
  }

  await supabase.from("audit_logs").insert({
    contract_id: contract.id,
    user_id: contract.user_id,
    event_type: "invoice_created",
    actor_email: recipientEmail,
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      payment_id: payment.id,
      payment_type: stage.paymentType,
      payment_milestone_id: stage.milestone?.id || null,
      amount: stage.amount,
      currency: contract.payment_currency || "usd",
      auto_created: true,
    },
  });

  if (sendEmail && recipientEmail) {
    try {
      await sendInvoiceEmail({
        to: recipientEmail,
        recipientName: recipientName || "Valued Customer",
        contractTitle: contract.title,
        invoiceNumber: invoice.invoice_number,
        amount: stage.amount,
        currency: contract.payment_currency || "usd",
        dueDate,
        paymentUrl: getInvoicePaymentUrl(invoice.id, baseUrl),
        lineItems,
        senderName: owner?.name || undefined,
        senderEmail: owner?.email || undefined,
        notes: invoiceSettings?.default_notes || undefined,
      });
    } catch (emailError) {
      console.error(
        `Failed to send invoice ${invoice.invoice_number} to ${recipientEmail}:`,
        emailError
      );
    }
  }

  return { invoice, payment, stage, created: true };
}

export async function sendContractPaymentInvoiceEmail({
  supabase,
  invoiceId,
  baseUrl,
}: {
  supabase: SupabaseClient;
  invoiceId: string;
  baseUrl?: string;
}) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, contract_id, invoice_number, amount, currency, due_date, recipient_name, recipient_email, sender_name, sender_email, line_items, notes"
    )
    .eq("id", invoiceId)
    .single();
  if (error || !invoice?.recipient_email || !invoice.contract_id) return false;

  const { data: contract } = await supabase
    .from("contracts")
    .select("title")
    .eq("id", invoice.contract_id)
    .single();
  const lineItems = Array.isArray(invoice.line_items)
    ? (invoice.line_items as Array<{
        description: string;
        quantity: number;
        amount: number;
      }>)
    : [];

  await sendInvoiceEmail({
    to: invoice.recipient_email,
    recipientName: invoice.recipient_name || "Valued Customer",
    contractTitle: contract?.title || "Contract payment",
    invoiceNumber: invoice.invoice_number,
    amount: invoice.amount,
    currency: invoice.currency || "usd",
    dueDate: invoice.due_date || new Date().toISOString(),
    paymentUrl: getInvoicePaymentUrl(invoice.id, baseUrl),
    lineItems,
    senderName: invoice.sender_name || undefined,
    senderEmail: invoice.sender_email || undefined,
    notes: invoice.notes || undefined,
  });
  return true;
}
