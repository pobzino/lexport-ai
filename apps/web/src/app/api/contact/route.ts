import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSupportEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 10000) {
      return NextResponse.json(
        { error: "Message is too long (max 10,000 characters)" },
        { status: 400 }
      );
    }

    const trimmed = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    };

    // Save to database first (reliable)
    const supabase = createAdminClient();
    const { error: dbError } = await supabase
      .from("contact_submissions")
      .insert(trimmed);

    if (dbError) {
      console.error("Failed to save contact submission:", dbError);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 }
      );
    }

    // Send email notification (best-effort — don't fail the request)
    try {
      await sendSupportEmail(trimmed);
    } catch (emailErr) {
      console.error("Contact email notification failed (submission saved):", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
