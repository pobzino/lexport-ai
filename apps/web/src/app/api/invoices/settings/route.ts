import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceSettings } from "@/db/types";

// GET invoice settings for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch settings for the user
    const { data: settings, error } = await supabase
      .from("invoice_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Error fetching invoice settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Return defaults if no settings exist
    if (!settings) {
      return NextResponse.json({
        settings: {
          user_id: user.id,
          number_prefix: "INV-",
          next_number: 1,
          company_name: null,
          company_address: null,
          company_logo_url: null,
          default_due_days: 30,
          default_notes: null,
          default_payment_terms: "Net 30",
        } as InvoiceSettings,
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in invoice settings GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - update invoice settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      number_prefix,
      company_name,
      company_address,
      company_logo_url,
      default_due_days,
      default_notes,
      default_payment_terms,
    } = body;

    // Validate prefix format
    if (number_prefix && typeof number_prefix !== "string") {
      return NextResponse.json(
        { error: "Invalid prefix format" },
        { status: 400 }
      );
    }

    // Validate due days
    if (default_due_days !== undefined) {
      const days = parseInt(default_due_days);
      if (isNaN(days) || days < 0 || days > 365) {
        return NextResponse.json(
          { error: "Due days must be between 0 and 365" },
          { status: 400 }
        );
      }
    }

    // Upsert settings (insert if not exists, update if exists)
    const { data: settings, error } = await supabase
      .from("invoice_settings")
      .upsert(
        {
          user_id: user.id,
          number_prefix: number_prefix || "INV-",
          company_name: company_name || null,
          company_address: company_address || null,
          company_logo_url: company_logo_url || null,
          default_due_days: default_due_days || 30,
          default_notes: default_notes || null,
          default_payment_terms: default_payment_terms || "Net 30",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating invoice settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in invoice settings PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - increment and get next invoice number (for creating invoices)
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current settings
    const { data: currentSettings } = await supabase
      .from("invoice_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const prefix = currentSettings?.number_prefix || "INV-";
    const nextNumber = currentSettings?.next_number || 1;

    // Generate the invoice number
    const invoiceNumber = `${prefix}${String(nextNumber).padStart(5, "0")}`;

    // Increment the counter
    const { error } = await supabase.from("invoice_settings").upsert(
      {
        user_id: user.id,
        number_prefix: prefix,
        next_number: nextNumber + 1,
        default_due_days: currentSettings?.default_due_days || 30,
        default_payment_terms: currentSettings?.default_payment_terms || "Net 30",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error incrementing invoice number:", error);
      return NextResponse.json(
        { error: "Failed to generate invoice number" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoice_number: invoiceNumber,
      next_number: nextNumber + 1,
      settings: currentSettings,
    });
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
