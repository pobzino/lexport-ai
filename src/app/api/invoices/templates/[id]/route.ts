import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceLineItem } from "@/db/types";

// GET - Get a single template by ID
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

    // Fetch template - user can view system templates or their own
    const { data: template, error: templateError } = await supabase
      .from("invoice_templates")
      .select("*")
      .eq("id", id)
      .or(`is_system.eq.true,user_id.eq.${user.id}`)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update a template (only user's own templates)
export async function PUT(
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

    // First verify this is user's template and not a system template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("invoice_templates")
      .select("id, user_id, is_system")
      .eq("id", id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system templates" },
        { status: 403 }
      );
    }

    if (existingTemplate.user_id !== user.id) {
      return NextResponse.json(
        { error: "Cannot modify other users' templates" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      template_type,
      default_line_items,
      default_notes,
      default_due_days,
      default_payment_terms,
      hourly_rate,
      milestones,
      retainer_amount,
      retainer_period,
    } = body;

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Template name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (template_type !== undefined) {
      const validTypes = ["hourly", "fixed_fee", "milestone", "retainer", "custom"];
      if (!validTypes.includes(template_type)) {
        return NextResponse.json(
          { error: "Invalid template type" },
          { status: 400 }
        );
      }
      updateData.template_type = template_type;
    }

    if (default_line_items !== undefined) {
      const validatedLineItems: InvoiceLineItem[] = default_line_items.map(
        (item: Partial<InvoiceLineItem>) => ({
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          amount: item.amount || 0,
        })
      );
      updateData.default_line_items = validatedLineItems;
    }

    if (default_notes !== undefined) updateData.default_notes = default_notes || null;
    if (default_due_days !== undefined) updateData.default_due_days = default_due_days;
    if (default_payment_terms !== undefined) updateData.default_payment_terms = default_payment_terms;
    if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate || null;
    if (milestones !== undefined) updateData.milestones = milestones || null;
    if (retainer_amount !== undefined) updateData.retainer_amount = retainer_amount || null;
    if (retainer_period !== undefined) updateData.retainer_period = retainer_period || null;

    // Update template
    const { data: template, error: updateError } = await supabase
      .from("invoice_templates")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id) // Extra safety check
      .select()
      .single();

    if (updateError) {
      console.error("Error updating template:", updateError);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a template (only user's own templates)
export async function DELETE(
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

    // First verify this is user's template and not a system template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("invoice_templates")
      .select("id, user_id, is_system")
      .eq("id", id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system templates" },
        { status: 403 }
      );
    }

    if (existingTemplate.user_id !== user.id) {
      return NextResponse.json(
        { error: "Cannot delete other users' templates" },
        { status: 403 }
      );
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from("invoice_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Extra safety check

    if (deleteError) {
      console.error("Error deleting template:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
