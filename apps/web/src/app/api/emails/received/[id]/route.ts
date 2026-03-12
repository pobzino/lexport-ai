import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResendClient } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up the received email (RLS ensures user can only access their own)
    const { data: receivedEmail, error } = await supabase
      .from("received_emails")
      .select("resend_email_id, user_id, thread_id")
      .eq("id", id)
      .single();

    if (error || !receivedEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Fetch full email content from Resend API
    const resend = getResendClient();
    const { data: emailContent, error: resendError } =
      await resend.emails.receiving.get(receivedEmail.resend_email_id);

    if (resendError) {
      console.error("Error fetching email content from Resend:", resendError);
      return NextResponse.json(
        { error: "Failed to fetch email content" },
        { status: 502 }
      );
    }

    // Mark as read if not already
    await supabase
      .from("received_emails")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("read", false);

    return NextResponse.json({
      id,
      resend_email_id: receivedEmail.resend_email_id,
      thread_id: receivedEmail.thread_id,
      from: emailContent.from,
      to: emailContent.to,
      cc: emailContent.cc,
      bcc: emailContent.bcc,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      headers: emailContent.headers,
      message_id: emailContent.message_id,
      created_at: emailContent.created_at,
      attachments: emailContent.attachments,
    });
  } catch (error) {
    console.error("Error in received email GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
