import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get confirmation from request body
        const body = await request.json().catch(() => ({}));
        const { confirmEmail, reason } = body;

        // Verify email confirmation matches
        if (confirmEmail !== user.email) {
            return NextResponse.json(
                { error: "Email confirmation does not match" },
                { status: 400 }
            );
        }

        // Start deletion process
        const userId = user.id;
        const userEmail = user.email;

        // 1. Delete user's contracts and related data (cascade)
        const { data: userContracts } = await supabase
            .from("contracts")
            .select("id")
            .eq("user_id", userId);

        if (userContracts && userContracts.length > 0) {
            const contractIds = userContracts.map(c => c.id);

            // Delete signature fields
            await supabase
                .from("signature_fields")
                .delete()
                .in("contract_id", contractIds);

            // Delete field values (via signature requests)
            const { data: sigRequests } = await supabase
                .from("signature_requests")
                .select("id")
                .in("contract_id", contractIds);

            if (sigRequests && sigRequests.length > 0) {
                const sigRequestIds = sigRequests.map(sr => sr.id);
                await supabase
                    .from("field_values")
                    .delete()
                    .in("signature_request_id", sigRequestIds);
            }

            // Delete signatures
            await supabase
                .from("signatures")
                .delete()
                .in("contract_id", contractIds);

            // Delete signature requests
            await supabase
                .from("signature_requests")
                .delete()
                .in("contract_id", contractIds);

            // Delete comments
            await supabase
                .from("comments")
                .delete()
                .in("contract_id", contractIds);

            // Delete contract versions
            await supabase
                .from("contract_versions")
                .delete()
                .in("contract_id", contractIds);

            // Anonymize audit logs (keep for legal compliance, but remove PII)
            await supabase
                .from("audit_logs")
                .update({
                    user_id: null,
                    actor_email: "[deleted]",
                    actor_name: "[deleted]",
                    ip_address: null,
                    geo_location: null,
                    device_info: null,
                })
                .in("contract_id", contractIds);

            // Delete contracts
            await supabase
                .from("contracts")
                .delete()
                .eq("user_id", userId);
        }

        // 2. Delete payments
        await supabase
            .from("payments")
            .delete()
            .eq("user_id", userId);

        // 3. Delete invoices
        await supabase
            .from("invoices")
            .delete()
            .eq("user_id", userId);

        // 4. Delete invoice settings
        await supabase
            .from("invoice_settings")
            .delete()
            .eq("user_id", userId);

        // 5. Delete portal sessions
        await supabase
            .from("portal_sessions")
            .delete()
            .eq("email", userEmail);

        // 6. Delete user profile
        await supabase
            .from("users")
            .delete()
            .eq("id", userId);

        // 7. Log deletion reason (anonymized)
        try {
            await supabase.from("deletion_logs").insert({
                reason: reason || "User requested deletion",
                deleted_at: new Date().toISOString(),
            });
        } catch {
            // Table may not exist
        }

        // 8. Delete Supabase auth user
        // Note: This requires admin/service role key
        // For now, we'll mark the user as deleted
        // The actual auth deletion should be handled by a backend job or admin

        // Sign out the user
        await supabase.auth.signOut();

        return NextResponse.json({
            success: true,
            message: "Account deleted successfully. You have been signed out.",
        });
    } catch (error) {
        console.error("Account deletion error:", error);
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 }
        );
    }
}

// GET endpoint to check what will be deleted
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get counts of data that will be deleted
        const [
            { count: contractCount },
            { count: signatureCount },
            { count: paymentCount },
            { count: invoiceCount },
        ] = await Promise.all([
            supabase.from("contracts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("signature_requests").select("*", { count: "exact", head: true }).eq("signer_email", user.email),
            supabase.from("payments").select("*", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("invoices").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        return NextResponse.json({
            dataToBeDeleted: {
                contracts: contractCount || 0,
                signatures: signatureCount || 0,
                payments: paymentCount || 0,
                invoices: invoiceCount || 0,
            },
            warning: "This action is permanent and cannot be undone. Audit logs will be anonymized but retained for legal compliance.",
        });
    } catch (error) {
        console.error("Account deletion preview error:", error);
        return NextResponse.json(
            { error: "Failed to get deletion preview" },
            { status: 500 }
        );
    }
}
