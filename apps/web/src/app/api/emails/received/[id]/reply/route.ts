import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email";
import { normalizeSubject } from "@/lib/email-threading";

const REPLY_FROM = "Lexport <hello@lexportai.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

function buildReplyHtml(body: string): string {
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
  request: NextRequest,
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

    const { body } = await request.json();

    if (!body || !body.trim()) {
      return NextResponse.json(
        { error: "Reply body is required" },
        { status: 400 }
      );
    }

    // Get the original email from DB
    const { data: receivedEmail, error: dbError } = await supabase
      .from("received_emails")
      .select("id, resend_email_id, from_address, subject, message_id, thread_id")
      .eq("id", id)
      .single();

    if (dbError || !receivedEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Extract sender email address
    const senderEmailMatch = receivedEmail.from_address.match(/<(.+?)>/);
    const senderEmail = senderEmailMatch
      ? senderEmailMatch[1]
      : receivedEmail.from_address;

    // Build subject line
    const subject = receivedEmail.subject?.startsWith("Re:")
      ? receivedEmail.subject
      : `Re: ${receivedEmail.subject || "(no subject)"}`;

    const replyHtml = buildReplyHtml(body);

    // Send via Resend with threading headers
    const resend = getResendClient();

    const headers: Record<string, string> = {};
    if (receivedEmail.message_id) {
      headers["In-Reply-To"] = receivedEmail.message_id;
      headers["References"] = receivedEmail.message_id;
    }

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: REPLY_FROM,
      to: [senderEmail],
      subject,
      html: replyHtml,
      replyTo: "hello@lexportai.com",
      headers,
    });

    if (sendError) {
      console.error("Error sending reply:", sendError);
      return NextResponse.json(
        { error: "Failed to send reply" },
        { status: 500 }
      );
    }

    // Persist the sent email
    const threadId = receivedEmail.thread_id || normalizeSubject(subject);
    const adminClient = createAdminClient();

    const { data: sentEmail } = await adminClient
      .from("sent_emails")
      .insert({
        user_id: user.id,
        resend_email_id: sendResult?.id || null,
        from_address: REPLY_FROM,
        to_addresses: [senderEmail],
        subject,
        html: replyHtml,
        text_body: body,
        in_reply_to: receivedEmail.message_id || null,
        reply_to_received_email_id: receivedEmail.id,
        thread_id: threadId,
        status: "sent",
      })
      .select("id")
      .single();

    return NextResponse.json({
      success: true,
      emailId: sendResult?.id,
      sentEmailId: sentEmail?.id,
    });
  } catch (error) {
    console.error("Error in reply route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
