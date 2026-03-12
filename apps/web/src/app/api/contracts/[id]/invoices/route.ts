import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceLineItem, Payment } from "@/db/types";
import { insertInvoiceWithRetry } from "@/lib/invoices/create-invoice";

// Format currency
function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount / 100);
}

// GET - List invoices for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .eq("contract_id", id)
      .order("created_at", { ascending: false });

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error) {
    console.error("Error in invoices API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create an invoice for a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { paymentId, recipientName, recipientEmail, recipientAddress, notes } = body;

    // Verify contract ownership and get details
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, title, payment_amount, payment_currency")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get user info for sender details
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    // Get payment if specified
    let payment: Payment | null = null;
    if (paymentId) {
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .eq("contract_id", id)
        .single();
      payment = paymentData;
    }

    // Calculate invoice amounts
    const amount = payment?.amount || Math.round((contract.payment_amount || 0) * 100);
    const currency = payment?.currency || contract.payment_currency || "usd";

    // Create line items
    const lineItems: InvoiceLineItem[] = [
      {
        description: payment
          ? `${payment.payment_type === "deposit" ? "Deposit" : payment.payment_type === "balance" ? "Balance" : "Full"} Payment - ${contract.title}`
          : contract.title,
        quantity: 1,
        unit_price: amount,
        amount: amount,
      },
    ];

    // Calculate totals
    const subtotal = amount;
    const taxAmount = 0; // No tax calculation for now
    const total = subtotal + taxAmount;

    // Create invoice
    const invoiceData = {
      contract_id: id,
      payment_id: paymentId || null,
      user_id: user.id,
      amount,
      currency,
      status: payment?.status === "succeeded" ? "paid" : "sent",
      line_items: lineItems,
      subtotal,
      tax_amount: taxAmount,
      total,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      paid_at: payment?.status === "succeeded" ? new Date().toISOString() : null,
      sent_at: new Date().toISOString(),
      recipient_name: recipientName || payment?.payer_name || null,
      recipient_email: recipientEmail || payment?.payer_email || null,
      recipient_address: recipientAddress || null,
      sender_name: userData?.name || null,
      sender_email: userData?.email || null,
      notes: notes || null,
    };

    const { data: invoice, error: insertError } = await insertInvoiceWithRetry<{
      id: string;
      invoice_number: string;
      amount: number;
      currency: string;
    }>(
      supabase,
      invoiceData
    );

    if (insertError) {
      console.error("Error creating invoice:", insertError);
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from("audit_logs").insert({
      contract_id: id,
      user_id: user.id,
      event_type: "invoice_created",
      actor_email: user.email,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
      },
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
