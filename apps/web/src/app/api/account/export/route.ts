import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

        // Check rate limiting (1 export per 24 hours)
        const { data: lastExport } = await supabase
            .from("data_exports")
            .select("created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (lastExport) {
            const lastExportTime = new Date(lastExport.created_at).getTime();
            const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
            if (lastExportTime > twentyFourHoursAgo) {
                const nextAvailable = new Date(lastExportTime + 24 * 60 * 60 * 1000);
                return NextResponse.json(
                    {
                        error: "Rate limited. You can request a new export after " + nextAvailable.toLocaleString(),
                        nextAvailable: nextAvailable.toISOString()
                    },
                    { status: 429 }
                );
            }
        }

        // Fetch all user data
        const [
            { data: profile },
            { data: contracts },
            { data: signatureRequests },
            { data: signatures },
            { data: payments },
            { data: auditLogs },
            { data: comments },
            { data: invoices },
        ] = await Promise.all([
            // Profile
            supabase.from("users").select("*").eq("id", user.id).single(),
            // Contracts
            supabase.from("contracts").select("*").eq("user_id", user.id),
            // Signature requests (where user is a signer)
            supabase.from("signature_requests").select("*").eq("signer_email", user.email),
            // Signatures
            supabase.from("signatures")
                .select("*")
                .in("signature_request_id",
                    (await supabase.from("signature_requests").select("id").eq("signer_email", user.email)).data?.map(r => r.id) || []
                ),
            // Payments
            supabase.from("payments").select("*").eq("user_id", user.id),
            // Audit logs
            supabase.from("audit_logs").select("*").eq("user_id", user.id).limit(1000),
            // Comments
            supabase.from("comments").select("*").eq("user_id", user.id),
            // Invoices
            supabase.from("invoices").select("*").eq("user_id", user.id),
        ]);

        // Build export data
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportVersion: "1.0",
            user: {
                id: profile?.id,
                email: profile?.email,
                name: profile?.name,
                role: profile?.role,
                jurisdiction: profile?.jurisdiction,
                createdAt: profile?.created_at,
            },
            contracts: contracts?.map(c => ({
                id: c.id,
                title: c.title,
                type: c.type,
                jurisdiction: c.jurisdiction,
                status: c.status,
                content: c.content,
                createdAt: c.created_at,
                updatedAt: c.updated_at,
            })) || [],
            signatureRequests: signatureRequests?.map(sr => ({
                id: sr.id,
                contractId: sr.contract_id,
                role: sr.signer_role,
                status: sr.status,
                signedAt: sr.signed_at,
                createdAt: sr.created_at,
            })) || [],
            signatures: signatures?.map(s => ({
                id: s.id,
                type: s.type,
                signedAt: s.signed_at,
                // Note: We include signature_data as it's the user's own data
                signatureData: s.signature_data,
            })) || [],
            payments: payments?.map(p => ({
                id: p.id,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                paymentType: p.payment_type,
                createdAt: p.created_at,
            })) || [],
            comments: comments?.map(c => ({
                id: c.id,
                contractId: c.contract_id,
                content: c.content,
                createdAt: c.created_at,
            })) || [],
            invoices: invoices?.map(i => ({
                id: i.id,
                invoiceNumber: i.invoice_number,
                amount: i.amount,
                currency: i.currency,
                status: i.status,
                createdAt: i.created_at,
            })) || [],
            auditLogs: auditLogs?.map(a => ({
                eventType: a.event_type,
                createdAt: a.created_at,
                ipAddress: a.ip_address,
            })) || [],
        };

        // Log the export (for rate limiting)
        // Note: This table may not exist yet - will fail silently
        try {
            await supabase.from("data_exports").insert({
                user_id: user.id,
                export_type: "full",
            });
        } catch {
            // Table doesn't exist yet, skip logging
        }

        // Return as JSON download
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="lexport-data-export-${new Date().toISOString().split("T")[0]}.json"`,
            },
        });
    } catch (error) {
        console.error("Data export error:", error);
        return NextResponse.json(
            { error: "Failed to export data" },
            { status: 500 }
        );
    }
}
