import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResendClient } from "@/lib/email";

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
      .select("resend_email_id, from_address, subject, message_id")
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

    // Build reply HTML
    const replyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1e293b;">
        ${body.replace(/\n/g, "<br>")}
      </div>
    `;

    // Send via Resend with threading headers
    const resend = getResendClient();

    const headers: Record<string, string> = {};
    if (receivedEmail.message_id) {
      headers["In-Reply-To"] = receivedEmail.message_id;
      headers["References"] = receivedEmail.message_id;
    }

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Lexport <hello@lexportai.com>",
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

    return NextResponse.json({
      success: true,
      emailId: sendResult?.id,
    });
  } catch (error) {
    console.error("Error in reply route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
