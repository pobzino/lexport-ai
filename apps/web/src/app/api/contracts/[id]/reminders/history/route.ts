import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/contracts/[id]/reminders/history
 * Fetch reminder history for a contract
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contractId = params.id;

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
        { error: "Not authorized to view this contract" },
        { status: 403 }
      );
    }

    // Fetch reminder history
    const { data: history, error: historyError } = await supabase
      .from("signature_reminder_history")
      .select("*")
      .eq("contract_id", contractId)
      .order("sent_at", { ascending: false })
      .limit(20);

    if (historyError) {
      console.error("Failed to fetch reminder history:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch reminder history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      history: history || [],
    });
  } catch (error) {
    console.error("Error fetching reminder history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
