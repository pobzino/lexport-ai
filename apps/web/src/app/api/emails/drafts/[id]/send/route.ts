import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email";
import { normalizeSubject } from "@/lib/email-threading";

const REPLY_FROM = "Lexport <hello@lexportai.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

function buildEmailHtml(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f8fafc; margin: 0; padding: 0;">
  <div style="background: linear-gradient(135deg, #202e46 0%, #2a3a54 100%); padding: 20px; text-align: center;">
    <a href="${APP_URL}" style="text-decoration: none;">
      <img src="${APP_URL}/dark-logo.png" alt="Lexport" height="32" style="height: 32px; width: auto;" />
    </a>
  </div>
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="font-size: 14px; color: #1e293b; line-height: 1.7;">
        ${body.replace(/\n/g, "<br>")}
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0;">Sent from <a href="${APP_URL}" style="color: #529ec6; text-decoration: none;">Lexport</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from("email_drafts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (!draft.to_addresses || draft.to_addresses.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 }
      );
    }

    if (!draft.body?.trim()) {
      return NextResponse.json(
        { error: "Email body is required" },
        { status: 400 }
      );
    }

    const subject = draft.subject || "(no subject)";
    const html = buildEmailHtml(draft.body);

    // Build threading headers if this is a reply
    const headers: Record<string, string> = {};
    let inReplyTo: string | null = null;

    if (draft.reply_to_received_email_id) {
      const { data: originalEmail } = await supabase
        .from("received_emails")
        .select("message_id")
        .eq("id", draft.reply_to_received_email_id)
        .single();

      if (originalEmail?.message_id) {
        headers["In-Reply-To"] = originalEmail.message_id;
        headers["References"] = originalEmail.message_id;
        inReplyTo = originalEmail.message_id;
      }
    }

    // Send via Resend
    const resend = getResendClient();
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: REPLY_FROM,
      to: draft.to_addresses,
      subject,
      html,
      replyTo: "hello@lexportai.com",
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (sendError) {
      console.error("Error sending draft:", sendError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Persist as sent email
    const threadId = draft.thread_id || normalizeSubject(subject);
    const adminClient = createAdminClient();

    await adminClient.from("sent_emails").insert({
      user_id: user.id,
      resend_email_id: sendResult?.id || null,
      from_address: REPLY_FROM,
      to_addresses: draft.to_addresses,
      subject,
      html,
      text_body: draft.body,
      in_reply_to: inReplyTo,
      reply_to_received_email_id: draft.reply_to_received_email_id,
      thread_id: threadId,
      status: "sent",
    });

    // Delete the draft
    await supabase
      .from("email_drafts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      emailId: sendResult?.id,
    });
  } catch (error) {
    console.error("Error in send draft route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
