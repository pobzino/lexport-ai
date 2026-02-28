import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ToggleSchema = z.object({
  signatureRequestId: z.string().uuid(),
  reminderEnabled: z.boolean(),
});

/**
 * POST /api/contracts/[id]/reminders/toggle
 * Toggle auto-reminders for a signature request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const result = ToggleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.issues },
        { status: 400 }
      );
    }

    const { signatureRequestId, reminderEnabled } = result.data;
    const contractId = id;

    // Verify user owns the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (contract.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to modify this contract" },
        { status: 403 }
      );
    }

    // Verify signature request belongs to this contract
    const { data: sigRequest, error: sigRequestError } = await supabase
      .from("signature_requests")
      .select("id, contract_id")
      .eq("id", signatureRequestId)
      .eq("contract_id", contractId)
      .single();

    if (sigRequestError || !sigRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      );
    }

    // Update reminder_enabled
    const { data: updated, error: updateError } = await supabase
      .from("signature_requests")
      .update({
        reminder_enabled: reminderEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signatureRequestId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update reminder setting:", updateError);
      return NextResponse.json(
        { error: "Failed to update reminder setting" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signatureRequest: updated,
    });
  } catch (error) {
    console.error("Error toggling reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
