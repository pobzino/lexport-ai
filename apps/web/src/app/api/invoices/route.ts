import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceLineItem, InvoiceStatus } from "@/db/types";
import { generateInvoiceNumber, getInvoiceSettings } from "@/lib/invoices/generate-number";

function formatInvoiceInsertError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null) {
  if (!error) {
    return "Failed to create invoice";
  }

  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Code: ${error.code}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "Failed to create invoice";
}

// GET - List all invoices for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as InvoiceStatus | null;
    const contractId = searchParams.get("contract_id");
    const standalone = searchParams.get("standalone"); // "true" for standalone only
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (contractId) {
      query = query.eq("contract_id", contractId);
    }

    if (standalone === "true") {
      query = query.is("contract_id", null);
    }

    if (search) {
      // Search by invoice number or recipient name/email
      query = query.or(
        `invoice_number.ilike.%${search}%,recipient_name.ilike.%${search}%,recipient_email.ilike.%${search}%`
      );
    }

    const { data: invoices, count, error: invoicesError } = await query;

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    // Get contract titles for invoices that have contract_id
    const contractIds = [...new Set(
      (invoices || [])
        .filter((inv) => inv.contract_id)
        .map((inv) => inv.contract_id)
    )];

    let contractTitles: Record<string, string> = {};
    if (contractIds.length > 0) {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, title")
        .in("id", contractIds);

      contractTitles = (contracts || []).reduce((acc, c) => {
        acc[c.id] = c.title;
        return acc;
      }, {} as Record<string, string>);
    }

    // Add contract titles to invoices
    const invoicesWithTitles = (invoices || []).map((inv) => ({
      ...inv,
      contract_title: inv.contract_id ? contractTitles[inv.contract_id] : null,
    }));

    return NextResponse.json({
      invoices: invoicesWithTitles,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in invoices API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new invoice (standalone or contract-linked)
export async function POST(request: NextRequest) {
  try {
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
    const {
      template_id,
      contract_id, // Optional - for contract-linked invoices
      sender_name: bodySenderName,
      sender_email: bodySenderEmail,
      sender_address: bodySenderAddress,
      recipient_name,
      recipient_email,
      recipient_address,
      line_items = [],
      notes,
      due_date,
      currency = "usd",
      status = "draft", // Default to draft for new invoices
    } = body;

    // Validate required fields
    if (!recipient_name || !recipient_email) {
      return NextResponse.json(
        { error: "Recipient name and email are required" },
        { status: 400 }
      );
    }

    // Note: sender_name is validated later after settings fallback

    if (!line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      );
    }

    // Validate and calculate line items
    let subtotal = 0;
    const validatedLineItems: InvoiceLineItem[] = line_items.map(
      (item: Partial<InvoiceLineItem>) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || 0;
        const amount = quantity * unitPrice;
        subtotal += amount;

        return {
          description: item.description || "",
          quantity,
          unit_price: unitPrice,
          amount,
        };
      }
    );

    // Validate contract_id if provided
    if (contract_id) {
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .select("id, user_id")
        .eq("id", contract_id)
        .eq("user_id", user.id)
        .single();

      if (contractError || !contract) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }
    }

    // Get invoice settings for sender info and calculate due date
    const settings = await getInvoiceSettings(supabase, user.id);

    // Get user info for sender details
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    // Generate sequential invoice number
    const invoiceNumber = await generateInvoiceNumber(supabase, user.id);

    // Calculate due date
    const dueDays = settings.default_due_days || 30;
    const calculatedDueDate = due_date || new Date(
      Date.now() + dueDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Calculate totals
    const taxAmount = 0; // No tax calculation for now
    const total = subtotal + taxAmount;

    // Create invoice
    const invoiceData = {
      user_id: user.id,
      contract_id: contract_id || null,
      template_id: template_id || null,
      invoice_number: invoiceNumber,
      amount: total,
      currency,
      status: status as InvoiceStatus,
      line_items: validatedLineItems,
      subtotal,
      tax_amount: taxAmount,
      total,
      due_date: calculatedDueDate,
      paid_at: null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      recipient_name,
      recipient_email,
      recipient_address: recipient_address || null,
      sender_name: bodySenderName || settings.company_name || userData?.name || null,
      sender_email: bodySenderEmail || userData?.email || null,
      sender_address: bodySenderAddress
        ? { address: bodySenderAddress }
        : settings.company_address
          ? { address: settings.company_address }
          : null,
      notes: notes || settings.default_notes || null,
    };

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invoice:", insertError);
      return NextResponse.json(
        { error: formatInvoiceInsertError(insertError) },
        { status: 500 }
      );
    }

    // Log audit event if contract-linked
    if (contract_id) {
      await supabase.from("audit_logs").insert({
        contract_id,
        user_id: user.id,
        event_type: "invoice_created",
        actor_email: user.email,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: invoice.amount,
          currency: invoice.currency,
          standalone: false,
        },
      });
    }

    // Auto-save recipient as contact (fire-and-forget)
    Promise.resolve().then(async () => {
      try {
        await supabase.from("contacts").upsert(
          {
            user_id: user.id,
            name: recipient_name,
            email: recipient_email.toLowerCase(),
            ...(recipient_address ? { address: { address: recipient_address } } : {}),
            last_used_at: new Date().toISOString(),
          },
          { onConflict: "user_id,email" }
        );
      } catch (err) {
        console.error("Failed to auto-save invoice recipient as contact:", err);
      }
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
