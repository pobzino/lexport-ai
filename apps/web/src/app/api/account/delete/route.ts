import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

function isStripeResourceMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { type?: string; code?: string };
  return maybeError.type === "StripeInvalidRequestError" && maybeError.code === "resource_missing";
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string };
  return maybeError.code === "PGRST205" || maybeError.code === "42P01";
}

async function cancelStripeBilling(stripeSubscriptionId: string | null, stripeCustomerId: string | null) {
  const stripe = getStripe();

  if (stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      if (subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      }
    } catch (error) {
      if (!isStripeResourceMissing(error)) {
        throw error;
      }
    }
  }

  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);

      if (!("deleted" in customer && customer.deleted)) {
        await stripe.customers.del(stripeCustomerId);
      }
    } catch (error) {
      if (!isStripeResourceMissing(error)) {
        throw error;
      }
    }
  }
}

async function getOwnedOrganizationNames(adminSupabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await adminSupabase
    .from("organization_members")
    .select("organization_id, organizations(id, name)")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((membership: any) => {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;

    return organization?.name || membership.organization_id;
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { confirmEmail, reason } = body;

    if (confirmEmail !== user.email) {
      return NextResponse.json(
        { error: "Email confirmation does not match" },
        { status: 400 }
      );
    }

    const userId = user.id;
    const userEmail = user.email ?? "";
    const adminSupabase = createAdminClient();

    const ownedOrganizations = await getOwnedOrganizationNames(adminSupabase, userId);
    if (ownedOrganizations.length > 0) {
      return NextResponse.json(
        {
          error: "Transfer or delete your organization before deleting your account.",
          ownedOrganizations,
        },
        { status: 409 }
      );
    }

    const { data: userRecord, error: userRecordError } = await adminSupabase
      .from("users")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (userRecordError) {
      throw userRecordError;
    }

    await cancelStripeBilling(
      userRecord?.stripe_subscription_id ?? null,
      userRecord?.stripe_customer_id ?? null
    );

    const { data: userContracts, error: contractsError } = await adminSupabase
      .from("contracts")
      .select("id")
      .eq("user_id", userId);

    if (contractsError) {
      throw contractsError;
    }

    if (userContracts && userContracts.length > 0) {
      const contractIds = userContracts.map((contract) => contract.id);

      const { data: signatureRequests, error: signatureRequestsError } = await adminSupabase
        .from("signature_requests")
        .select("id")
        .in("contract_id", contractIds);

      if (signatureRequestsError) {
        throw signatureRequestsError;
      }

      const signatureRequestIds = (signatureRequests ?? []).map((requestRow) => requestRow.id);

      if (signatureRequestIds.length > 0) {
        const { error: fieldValuesError } = await adminSupabase
          .from("field_values")
          .delete()
          .in("signature_request_id", signatureRequestIds);

        if (fieldValuesError) {
          throw fieldValuesError;
        }
      }

      const contractScopedDeletes = await Promise.all([
        adminSupabase.from("signature_fields").delete().in("contract_id", contractIds),
        adminSupabase.from("signatures").delete().in("contract_id", contractIds),
        adminSupabase.from("signature_requests").delete().in("contract_id", contractIds),
        adminSupabase.from("comments").delete().in("contract_id", contractIds),
        adminSupabase.from("contract_versions").delete().in("contract_id", contractIds),
        adminSupabase.from("audit_logs").update({
          user_id: null,
          actor_email: "[deleted]",
          actor_name: "[deleted]",
          ip_address: null,
          geo_location: null,
          device_info: null,
        }).in("contract_id", contractIds),
        adminSupabase.from("contracts").delete().eq("user_id", userId),
      ]);

      for (const result of contractScopedDeletes) {
        if (result.error) {
          throw result.error;
        }
      }
    }

    const userScopedDeletes = await Promise.all([
      adminSupabase.from("payments").delete().eq("user_id", userId),
      adminSupabase.from("invoices").delete().eq("user_id", userId),
      adminSupabase.from("invoice_settings").delete().eq("user_id", userId),
      adminSupabase.from("portal_sessions").delete().eq("email", userEmail),
      adminSupabase.from("contacts").delete().eq("user_id", userId),
      adminSupabase.from("template_purchases").delete().eq("user_id", userId),
      adminSupabase.from("notifications").delete().eq("user_id", userId),
      adminSupabase.from("notification_preferences").delete().eq("user_id", userId),
      adminSupabase.from("folders").delete().eq("user_id", userId),
      adminSupabase.from("tags").delete().eq("user_id", userId),
      adminSupabase.from("onboarding_progress").delete().eq("user_id", userId),
      adminSupabase.from("dismissed_tips").delete().eq("user_id", userId),
      adminSupabase.from("usage_history").delete().eq("user_id", userId),
      adminSupabase.from("organization_members").delete().eq("user_id", userId),
    ]);

    for (const result of userScopedDeletes) {
      if (result.error && !isMissingRelationError(result.error)) {
        throw result.error;
      }
    }

    const { error: deleteProfileError } = await adminSupabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      throw deleteProfileError;
    }

    try {
      await adminSupabase.from("deletion_logs").insert({
        reason: reason || "User requested deletion",
        deleted_at: new Date().toISOString(),
      });
    } catch {
      // Optional table - ignore when absent.
    }

    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      throw deleteAuthError;
    }

    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully. Your subscription has been canceled.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

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

    const adminSupabase = createAdminClient();
    const ownedOrganizations = await getOwnedOrganizationNames(adminSupabase, user.id);

    const [
      { count: contractCount },
      { count: signatureCount },
      { count: paymentCount },
      { count: invoiceCount },
      { data: userRecord, error: userRecordError },
    ] = await Promise.all([
      supabase.from("contracts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("signature_requests").select("*", { count: "exact", head: true }).eq("signer_email", user.email),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("invoices").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      adminSupabase
        .from("users")
        .select("stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status")
        .eq("id", user.id)
        .single(),
    ]);

    if (userRecordError) {
      throw userRecordError;
    }

    return NextResponse.json({
      dataToBeDeleted: {
        contracts: contractCount || 0,
        signatures: signatureCount || 0,
        payments: paymentCount || 0,
        invoices: invoiceCount || 0,
      },
      billing: {
        hasStripeCustomer: Boolean(userRecord?.stripe_customer_id),
        hasActiveSubscription: Boolean(
          userRecord?.stripe_subscription_id &&
          userRecord?.subscription_tier &&
          userRecord.subscription_tier !== "free"
        ),
        subscriptionTier: userRecord?.subscription_tier || "free",
        subscriptionStatus: userRecord?.subscription_status || "active",
      },
      canDelete: ownedOrganizations.length === 0,
      ownedOrganizations,
      warning: ownedOrganizations.length > 0
        ? "Transfer or delete your organization before deleting your account."
        : "This action is permanent and cannot be undone. Active personal subscriptions will be canceled immediately. Audit logs will be anonymized but retained for legal compliance.",
    });
  } catch (error) {
    console.error("Account deletion preview error:", error);
    return NextResponse.json(
      { error: "Failed to get deletion preview" },
      { status: 500 }
    );
  }
}
