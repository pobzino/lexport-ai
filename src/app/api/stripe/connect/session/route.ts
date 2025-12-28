import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAccountSession, getConnectAccount } from "@/lib/stripe";

// POST - Create account session for embedded Connect components
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Connect account ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "No Connect account found. Please create an account first." },
        { status: 400 }
      );
    }

    // Verify the account exists in Stripe
    try {
      await getConnectAccount(userData.stripe_connect_account_id);
    } catch {
      return NextResponse.json(
        { error: "Connect account not found in Stripe" },
        { status: 404 }
      );
    }

    // Create account session for embedded components
    const accountSession = await createAccountSession(userData.stripe_connect_account_id);

    return NextResponse.json({
      clientSecret: accountSession.client_secret,
      accountId: userData.stripe_connect_account_id,
    });
  } catch (error) {
    console.error("Error creating account session:", error);
    return NextResponse.json(
      { error: "Failed to create account session" },
      { status: 500 }
    );
  }
}
