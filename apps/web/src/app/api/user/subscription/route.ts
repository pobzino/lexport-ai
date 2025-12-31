import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user subscription data
    const { data: userData, error } = await supabase
      .from("users")
      .select(
        "subscription_tier, subscription_status, ai_contracts_used, ai_contracts_limit, signatures_used, signatures_limit"
      )
      .eq("id", user.id)
      .single();

    if (error) {
      // If columns don't exist yet, return defaults
      if (error.code === "42703") {
        return NextResponse.json({
          tier: "free",
          status: "active",
          aiContractsUsed: 0,
          aiContractsLimit: 1,
          signaturesUsed: 0,
          signaturesLimit: 3,
        });
      }
      throw error;
    }

    return NextResponse.json({
      tier: userData?.subscription_tier || "free",
      status: userData?.subscription_status || "active",
      aiContractsUsed: userData?.ai_contracts_used || 0,
      aiContractsLimit: userData?.ai_contracts_limit || 1,
      signaturesUsed: userData?.signatures_used || 0,
      signaturesLimit: userData?.signatures_limit || 3,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
