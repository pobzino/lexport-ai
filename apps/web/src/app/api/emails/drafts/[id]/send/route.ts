import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email";
import { normalizeSubject } from "@/lib/email-threading";

const REPLY_FROM = "Lexport <hello@lexportai.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

function buildEmailHtml(body: string): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">
${body.replace(/\n/g, "<br>")}
<br><br>
<div style="color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px;">
  <strong style="color: #202e46;">Lexport</strong><br>
  AI-powered contracts & e-signatures<br>
  <a href="${APP_URL}" style="color: #529ec6; text-decoration: none;">${APP_URL.replace("https://", "")}</a>
</div>
</div>`;
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
