import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignatureRequest {
  id: string;
  contract_id: string;
  signer_email: string;
  signer_name: string;
  token: string;
  expires_at: string;
  status: string;
  contract: {
    id: string;
    title: string;
    user_id: string;
    status: string;
    expiration_warning_24h_sent: boolean;
    expiration_warning_72h_sent: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://lexportai.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const results = {
      expiredContracts: 0,
      warnings24hSent: 0,
      warnings72hSent: 0,
      notificationsCreated: 0,
      errors: [] as string[],
    };

    // 1. Update expired contracts (past expiration date)
    const { data: expiredContracts, error: expiredError } = await supabase
      .from("contracts")
      .update({ status: "expired" })
      .eq("status", "pending_signature")
      .lt("expires_at", now.toISOString())
      .select("id, title, user_id");

    if (expiredError) {
      results.errors.push(`Error updating expired contracts: ${expiredError.message}`);
    } else if (expiredContracts && expiredContracts.length > 0) {
      results.expiredContracts = expiredContracts.length;

      // Create notifications for expired contracts
      const notifications = expiredContracts.map((contract) => ({
        user_id: contract.user_id,
        type: "contract_expired",
        title: "Contract Expired",
        message: `The contract "${contract.title}" has expired without all signatures.`,
        contract_id: contract.id,
        data: { expired_at: now.toISOString() },
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        results.errors.push(`Error creating expiration notifications: ${notifError.message}`);
      } else {
        results.notificationsCreated += notifications.length;
      }
    }

    // 2. Find signature requests expiring in next 24 hours (not yet warned)
    const { data: expiring24h, error: error24h } = await supabase
      .from("signature_requests")
      .select(`
        id,
        contract_id,
        signer_email,
        signer_name,
        token,
        expires_at,
        status,
        contract:contracts!inner(
          id,
          title,
          user_id,
          status,
          expiration_warning_24h_sent,
          expiration_warning_72h_sent,
          user:users!contracts_user_id_fkey(
            id,
            name,
            email
          )
        )
      `)
      .eq("status", "pending")
      .gt("expires_at", now.toISOString())
      .lte("expires_at", in24Hours.toISOString())
      .eq("contract.status", "pending_signature")
      .eq("contract.expiration_warning_24h_sent", false) as { data: SignatureRequest[] | null; error: unknown };

    if (error24h) {
      results.errors.push(`Error fetching 24h expiring requests: ${(error24h as Error).message}`);
    } else if (expiring24h && expiring24h.length > 0) {
      // Send 24-hour warning emails
      for (const request of expiring24h) {
        try {
          const hoursRemaining = Math.max(
            0,
            (new Date(request.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          const signingUrl = `${appUrl}/sign/${request.token}`;

          // Send email via Resend
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Lexport <noreply@lexportai.com>",
              to: [request.signer_email],
              subject: `URGENT: Contract expires in ${Math.round(hoursRemaining)} hours: ${request.contract.title}`,
              html: generateExpirationEmailHtml({
                signerName: request.signer_name,
                contractTitle: request.contract.title,
                signingUrl,
                hoursRemaining,
                expiresAt: request.expires_at,
                senderName: request.contract.user?.name || undefined,
                isUrgent: true,
              }),
            }),
          });

          if (emailResponse.ok) {
            results.warnings24hSent++;

            // Update contract to mark 24h warning sent
            await supabase
              .from("contracts")
              .update({
                expiration_warning_24h_sent: true,
                expiration_warning_sent_at: now.toISOString(),
              })
              .eq("id", request.contract_id);

            // Create notification for contract owner
            await supabase.from("notifications").insert({
              user_id: request.contract.user_id,
              type: "contract_expiring_soon",
              title: "Contract Expiring in 24 Hours",
              message: `"${request.contract.title}" expires in ${Math.round(hoursRemaining)} hours. ${request.signer_name} has not yet signed.`,
              contract_id: request.contract_id,
              data: {
                signer_name: request.signer_name,
                signer_email: request.signer_email,
                hours_remaining: hoursRemaining,
                expires_at: request.expires_at,
              },
            });
            results.notificationsCreated++;
          } else {
            const errorText = await emailResponse.text();
            results.errors.push(`Failed to send 24h warning to ${request.signer_email}: ${errorText}`);
          }
        } catch (e) {
          results.errors.push(`Error processing 24h warning for ${request.signer_email}: ${(e as Error).message}`);
        }
      }
    }

    // 3. Find signature requests expiring in 24-72 hours (not yet warned at 72h level)
    const { data: expiring72h, error: error72h } = await supabase
      .from("signature_requests")
      .select(`
        id,
        contract_id,
        signer_email,
        signer_name,
        token,
        expires_at,
        status,
        contract:contracts!inner(
          id,
          title,
          user_id,
          status,
          expiration_warning_24h_sent,
          expiration_warning_72h_sent,
          user:users!contracts_user_id_fkey(
            id,
            name,
            email
          )
        )
      `)
      .eq("status", "pending")
      .gt("expires_at", in24Hours.toISOString())
      .lte("expires_at", in72Hours.toISOString())
      .eq("contract.status", "pending_signature")
      .eq("contract.expiration_warning_72h_sent", false) as { data: SignatureRequest[] | null; error: unknown };

    if (error72h) {
      results.errors.push(`Error fetching 72h expiring requests: ${(error72h as Error).message}`);
    } else if (expiring72h && expiring72h.length > 0) {
      // Send 72-hour warning emails
      for (const request of expiring72h) {
        try {
          const hoursRemaining = Math.max(
            0,
            (new Date(request.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          const signingUrl = `${appUrl}/sign/${request.token}`;

          // Send email via Resend
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Lexport <noreply@lexportai.com>",
              to: [request.signer_email],
              subject: `Contract expires in ${Math.round(hoursRemaining / 24)} days: ${request.contract.title}`,
              html: generateExpirationEmailHtml({
                signerName: request.signer_name,
                contractTitle: request.contract.title,
                signingUrl,
                hoursRemaining,
                expiresAt: request.expires_at,
                senderName: request.contract.user?.name || undefined,
                isUrgent: false,
              }),
            }),
          });

          if (emailResponse.ok) {
            results.warnings72hSent++;

            // Update contract to mark 72h warning sent
            await supabase
              .from("contracts")
              .update({
                expiration_warning_72h_sent: true,
                expiration_warning_sent_at: now.toISOString(),
              })
              .eq("id", request.contract_id);

            // Create notification for contract owner
            await supabase.from("notifications").insert({
              user_id: request.contract.user_id,
              type: "contract_expiring_soon",
              title: "Contract Expiring Soon",
              message: `"${request.contract.title}" expires in ${Math.round(hoursRemaining / 24)} days. ${request.signer_name} has not yet signed.`,
              contract_id: request.contract_id,
              data: {
                signer_name: request.signer_name,
                signer_email: request.signer_email,
                hours_remaining: hoursRemaining,
                expires_at: request.expires_at,
              },
            });
            results.notificationsCreated++;
          } else {
            const errorText = await emailResponse.text();
            results.errors.push(`Failed to send 72h warning to ${request.signer_email}: ${errorText}`);
          }
        } catch (e) {
          results.errors.push(`Error processing 72h warning for ${request.signer_email}: ${(e as Error).message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-expirations function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Email template generator
function generateExpirationEmailHtml({
  signerName,
  contractTitle,
  signingUrl,
  hoursRemaining,
  expiresAt,
  senderName,
  isUrgent,
}: {
  signerName: string;
  contractTitle: string;
  signingUrl: string;
  hoursRemaining: number;
  expiresAt: string;
  senderName?: string;
  isUrgent: boolean;
}): string {
  const BRAND = {
    navy: "#202e46",
    blue: "#529ec6",
    emerald: "#10b981",
    slate: "#64748b",
    lightSlate: "#f1f5f9",
  };

  const urgencyConfig = isUrgent
    ? {
        bgColor: "#fef2f2",
        borderColor: "#ef4444",
        textColor: "#991b1b",
        label: "URGENT: Expires Soon",
        countdownColor: "#ef4444",
      }
    : {
        bgColor: "#fffbeb",
        borderColor: "#f59e0b",
        textColor: "#92400e",
        label: "Expiring Soon",
        countdownColor: "#f59e0b",
      };

  const formatTimeRemaining = () => {
    if (hoursRemaining < 1) {
      const minutes = Math.round(hoursRemaining * 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else if (hoursRemaining < 24) {
      const hours = Math.round(hoursRemaining);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else {
      const days = Math.round(hoursRemaining / 24);
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
  };

  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f8fafc; margin: 0; padding: 0;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, ${BRAND.navy} 0%, #2a3a54 100%); padding: 28px 20px; text-align: center;">
    <div style="display: inline-block;">
      <span style="color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -1px;">Lex</span><span style="color: ${BRAND.blue}; font-size: 28px; font-weight: 700; letter-spacing: -1px;">port</span>
    </div>
  </div>

  <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
    <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: ${urgencyConfig.bgColor}; color: ${urgencyConfig.textColor}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid ${urgencyConfig.borderColor};">${isUrgent ? "🚨" : "⏰"} ${urgencyConfig.label}</span>
      </div>

      <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Contract Expiring Soon</h2>

      <p style="margin: 16px 0; color: #475569;">Hi ${signerName},</p>

      <p style="margin: 16px 0; color: #475569;">
        ${isUrgent ? "<strong>This is an urgent reminder.</strong> " : ""}The following contract requires your signature and will expire soon:
      </p>

      <div style="background-color: ${urgencyConfig.bgColor}; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${urgencyConfig.borderColor};">
        <p style="margin: 0 0 12px; color: ${BRAND.navy}; font-size: 18px; font-weight: 600;">${contractTitle}</p>
        <div>
          <span style="font-size: 28px; font-weight: 700; color: ${urgencyConfig.countdownColor};">${formatTimeRemaining()}</span>
          <span style="color: ${urgencyConfig.textColor}; font-size: 14px; margin-left: 8px;">remaining</span>
        </div>
      </div>

      <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: ${BRAND.slate};">
          <strong>Expires:</strong> ${expirationDate}
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${signingUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.emerald} 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">${isUrgent ? "Sign Now - Urgent" : "Review & Sign"}</a>
      </div>

      <p style="margin: 16px 0; font-size: 14px; color: #475569; text-align: center;">
        ${isUrgent
          ? "After expiration, you will no longer be able to sign this document and a new signing request may need to be sent."
          : "Please complete your signature before the deadline to avoid any delays."
        }
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

      <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
        ${senderName ? `This contract was sent by ${senderName}. ` : ""}
        Can't click the button? Copy this link:<br>
        <a href="${signingUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${signingUrl}</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 32px; font-size: 13px; color: ${BRAND.slate};">
      <p style="margin: 0 0 8px;">Powered by <a href="https://lexportai.com" style="color: ${BRAND.blue}; text-decoration: none; font-weight: 500;">Lexport</a></p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">AI-powered contracts & e-signatures for modern businesses</p>
    </div>
  </div>
</body>
</html>
  `;
}
