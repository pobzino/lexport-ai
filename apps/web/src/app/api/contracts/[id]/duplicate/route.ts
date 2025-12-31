import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the original contract
    const { data: original, error: fetchError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Create a duplicate
    const { data: duplicate, error: insertError } = await supabase
      .from("contracts")
      .insert({
        user_id: user.id,
        title: `${original.title} (Copy)`,
        type: original.type,
        jurisdiction: original.jurisdiction,
        status: "draft",
        version: 1,
        content: original.content,
        metadata: original.metadata,
        payment_required: original.payment_required,
        payment_amount: original.payment_amount,
        payment_currency: original.payment_currency,
        payment_structure: original.payment_structure,
        deposit_percentage: original.deposit_percentage,
        source_type: original.source_type,
        source_file_url: original.source_file_url,
        source_file_type: original.source_file_type,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error duplicating contract:", insertError);
      return NextResponse.json({ error: "Failed to duplicate contract" }, { status: 500 });
    }

    // Also duplicate signature fields
    const { data: originalFields } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", id);

    if (originalFields && originalFields.length > 0) {
      const newFields = originalFields.map((field) => ({
        contract_id: duplicate.id,
        type: field.type,
        label: field.label,
        signer_role: field.signer_role,
        required: field.required,
        position_x: field.position_x,
        position_y: field.position_y,
        width: field.width,
        height: field.height,
        page: field.page,
        order: field.order,
        options: field.options,
      }));

      await supabase.from("signature_fields").insert(newFields);
    }

    return NextResponse.json({ contract: duplicate });
  } catch (error) {
    console.error("Error duplicating contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
