import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch received emails in this thread
    const { data: received } = await supabase
      .from("received_emails")
      .select(
        "id, resend_email_id, from_address, to_addresses, subject, message_id, has_attachments, attachment_count, read, created_at"
      )
      .eq("user_id", user.id)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    // Fetch sent emails in this thread
    const { data: sent } = await supabase
      .from("sent_emails")
      .select(
        "id, resend_email_id, from_address, to_addresses, subject, html, text_body, in_reply_to, created_at"
      )
      .eq("user_id", user.id)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    // Merge and sort chronologically
    const messages = [
      ...(received || []).map((e) => ({
        id: e.id,
        type: "received" as const,
        from: e.from_address,
        to: e.to_addresses,
        subject: e.subject,
        resend_email_id: e.resend_email_id,
        has_attachments: e.has_attachments,
        attachment_count: e.attachment_count,
        read: e.read,
        created_at: e.created_at,
      })),
      ...(sent || []).map((e) => ({
        id: e.id,
        type: "sent" as const,
        from: e.from_address,
        to: e.to_addresses,
        subject: e.subject,
        html: e.html,
        text_body: e.text_body,
        created_at: e.created_at,
      })),
    ].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json({
      thread_id: threadId,
      messages,
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
