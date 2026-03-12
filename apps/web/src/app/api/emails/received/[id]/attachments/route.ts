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
      .select("resend_email_id")
      .eq("id", id)
      .single();

    if (error || !receivedEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Fetch attachments from Resend API
    const resend = getResendClient();
    const { data: attachments, error: resendError } =
      await resend.emails.receiving.attachments.list({
        emailId: receivedEmail.resend_email_id,
      });

    if (resendError) {
      console.error(
        "Error fetching attachments from Resend:",
        resendError
      );
      return NextResponse.json(
        { error: "Failed to fetch attachments" },
        { status: 502 }
      );
    }

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("Error in received email attachments GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
