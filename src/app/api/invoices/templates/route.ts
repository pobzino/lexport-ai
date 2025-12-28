import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceTemplate, NewInvoiceTemplate, InvoiceLineItem } from "@/db/types";

// GET - List all templates (system + user's custom templates)
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
    const type = searchParams.get("type"); // Filter by template type
    const includeSystem = searchParams.get("includeSystem") !== "false"; // Include system templates by default

    // Build query - get system templates and user's templates
    let query = supabase
      .from("invoice_templates")
      .select("*")
      .order("is_system", { ascending: false }) // System templates first
      .order("usage_count", { ascending: false }) // Then by popularity
      .order("created_at", { ascending: false });

    // Filter by type if specified
    if (type) {
      query = query.eq("template_type", type);
    }

    // Filter to include system templates and user's own templates
    if (includeSystem) {
      query = query.or(`is_system.eq.true,user_id.eq.${user.id}`);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data: templates, error: templatesError } = await query;

    if (templatesError) {
      console.error("Error fetching templates:", templatesError);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error("Error in templates API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a custom template
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
      name,
      description,
      template_type = "custom",
      default_line_items = [],
      default_notes,
      default_due_days = 30,
      default_payment_terms = "Net 30",
      hourly_rate,
      milestones,
      retainer_amount,
      retainer_period,
    } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Validate template type
    const validTypes = ["hourly", "fixed_fee", "milestone", "retainer", "custom"];
    if (!validTypes.includes(template_type)) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 }
      );
    }

    // Validate line items structure
    const validatedLineItems: InvoiceLineItem[] = default_line_items.map(
      (item: Partial<InvoiceLineItem>) => ({
        description: item.description || "",
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        amount: item.amount || 0,
      })
    );

    // Create template
    const templateData: Omit<NewInvoiceTemplate, "is_system"> & { user_id: string; is_system: boolean; is_public: boolean } = {
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      template_type,
      is_system: false, // User templates are never system templates
      is_public: false, // User templates are private by default
      default_line_items: validatedLineItems,
      default_notes: default_notes || null,
      default_due_days,
      default_payment_terms,
      hourly_rate: hourly_rate || null,
      milestones: milestones || null,
      retainer_amount: retainer_amount || null,
      retainer_period: retainer_period || null,
    };

    const { data: template, error: insertError } = await supabase
      .from("invoice_templates")
      .insert(templateData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating template:", insertError);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
