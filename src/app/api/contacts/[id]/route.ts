import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/contacts/[id] - Get a single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: contact, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Error in GET /api/contacts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/contacts/[id] - Update a contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, company, role, phone, address, notes } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (company !== undefined) updateData.company = company;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;

    const { data: contact, error } = await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating contact:", error);
      return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
    }

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Error in PATCH /api/contacts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting contact:", error);
      return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/contacts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/contacts/[id]/use - Increment usage count (called when contact is used)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Increment usage count and update last_used_at
    const { data: contact, error } = await supabase.rpc("increment_contact_usage", {
      contact_id: id,
    });

    // Fallback if RPC doesn't exist - use raw update
    if (error) {
      const { data: updatedContact, error: updateError } = await supabase
        .from("contacts")
        .update({
          usage_count: supabase.rpc("increment_contact_usage_count", { row_id: id }),
          last_used_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        // Final fallback - just update last_used_at
        await supabase
          .from("contacts")
          .update({
            last_used_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Error in POST /api/contacts/[id]/use:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
