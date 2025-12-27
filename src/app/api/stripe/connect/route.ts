import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  getAccountStatus,
  createLoginLink,
  getAccountBalance,
} from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST - Create or retrieve Connect account and get onboarding link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const country = body.country || "US";

    // Check if user already has a Connect account
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_status, email, name")
      .eq("id", user.id)
      .single();

    // If user doesn't exist in users table, create them
    if (userError && userError.code === "PGRST116") {
      const { error: insertError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        stripe_connect_status: "not_connected",
        stripe_connect_onboarding_complete: false,
      });

      if (insertError) {
        console.error("Error creating user:", insertError);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }

      // Fetch the newly created user
      const { data: newUserData, error: newUserError } = await supabase
        .from("users")
        .select("stripe_connect_account_id, stripe_connect_status, email, name")
        .eq("id", user.id)
        .single();

      if (newUserError) {
        console.error("Error fetching new user:", newUserError);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      userData = newUserData;
    } else if (userError || !userData) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let accountId = userData!.stripe_connect_account_id;

    // If no account exists, create one
    if (!accountId) {
      const account = await createConnectAccount(
        userData!.email || user.email || "",
        country
      );
      accountId = account.id;

      // Save account ID to database
      await supabase
        .from("users")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // Create account link for onboarding
    const accountLink = await createAccountLink(
      accountId,
      `${APP_URL}/settings/payments?refresh=true`,
      `${APP_URL}/settings/payments?success=true`
    );

    return NextResponse.json({
      accountId,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return NextResponse.json(
      { error: "Failed to create Connect account" },
      { status: 500 }
    );
  }
}

// GET - Get Connect account status and details
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Connect account ID
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_status, stripe_connect_onboarding_complete")
      .eq("id", user.id)
      .single();

    // If user doesn't exist in users table, return not connected status
    // The user record will be created when they perform their first action
    if (userError && userError.code === "PGRST116") {
      return NextResponse.json({
        connected: false,
        status: "not_connected",
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirements: null,
        balance: null,
        dashboardUrl: null,
      });
    } else if (userError || !userData) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userData!.stripe_connect_account_id) {
      return NextResponse.json({
        connected: false,
        status: "not_connected",
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirements: null,
        balance: null,
        dashboardUrl: null,
      });
    }

    // Get account details from Stripe
    const account = await getConnectAccount(userData.stripe_connect_account_id);
    const status = getAccountStatus(account);

    // Update status in database if changed
    if (status !== userData.stripe_connect_status) {
      await supabase
        .from("users")
        .update({
          stripe_connect_status: status,
          stripe_connect_onboarding_complete: account.details_submitted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // Get balance if account is active
    let balance = null;
    let dashboardUrl = null;

    if (account.charges_enabled) {
      try {
        balance = await getAccountBalance(userData.stripe_connect_account_id);
      } catch (e) {
        console.warn("Could not fetch balance:", e);
      }

      try {
        const loginLink = await createLoginLink(userData.stripe_connect_account_id);
        dashboardUrl = loginLink.url;
      } catch (e) {
        console.warn("Could not create login link:", e);
      }
    }

    return NextResponse.json({
      connected: true,
      status,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        pastDue: account.requirements?.past_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
      },
      balance: balance ? {
        available: balance.available.map(b => ({
          amount: b.amount,
          currency: b.currency,
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount,
          currency: b.currency,
        })),
      } : null,
      dashboardUrl,
      payoutSchedule: account.settings?.payouts?.schedule,
    });
  } catch (error) {
    console.error("Error getting Connect account status:", error);
    return NextResponse.json(
      { error: "Failed to get account status" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect (removes from our database, doesn't delete Stripe account)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear Connect account from database
    await supabase
      .from("users")
      .update({
        stripe_connect_account_id: null,
        stripe_connect_status: "not_connected",
        stripe_connect_onboarding_complete: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
