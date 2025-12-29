import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when env vars are unavailable
let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Request schema
const ShareReviewSchema = z.object({
  reviewerEmail: z.string().email("Valid email required"),
  reviewerName: z.string().min(1, "Name required"),
  message: z.string().optional(),
  expiresInDays: z.number().min(1).max(30).default(7),
});

// POST - Create a review request and send invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const parseResult = ShareReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { reviewerEmail, reviewerName, message, expiresInDays } = parseResult.data;

    // Fetch and verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Don't allow sharing contracts that are already sent for signature
    if (contract.status === "pending_signature" || contract.status === "signed") {
      return NextResponse.json(
        { error: "Cannot share for review - contract is already sent for signature" },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Generate unique token
    const token = randomBytes(32).toString("hex");

    // Create review request
    const { data: reviewRequest, error: insertError } = await supabase
      .from("review_requests")
      .insert({
        contract_id: id,
        token,
        reviewer_email: reviewerEmail,
        reviewer_name: reviewerName,
        message,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating review request:", insertError);
      return NextResponse.json(
        { error: "Failed to create review request" },
        { status: 500 }
      );
    }

    // Build review URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const reviewUrl = `${baseUrl}/review/${token}`;

    // Get sender name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const senderName = profile?.full_name || "Someone";

    // Send email invitation
    let emailSent = false;
    try {
      await getResend().emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Lexport <noreply@lexportai.com>",
        to: reviewerEmail,
        subject: `${senderName} has shared "${contract.title}" for your review`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #202e46 0%, #2d3e5f 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Contract Review Request</h1>
            </div>

            <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 24px;">
                Hi ${reviewerName},
              </p>

              <p style="font-size: 16px; margin-bottom: 24px;">
                <strong>${senderName}</strong> has shared a contract for your review:
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #202e46;">${contract.title}</h2>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Please review and provide your feedback</p>
              </div>

              ${message ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-style: italic; color: #92400e;">"${message}"</p>
              </div>
              ` : ""}

              <div style="text-align: center; margin: 32px 0;">
                <a href="${reviewUrl}" style="display: inline-block; background: #202e46; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Review Contract
                </a>
              </div>

              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  <strong>This is a draft review.</strong> No signature is required at this time. You can review the contract and leave feedback before it's finalized.
                </p>
              </div>

              <p style="font-size: 14px; color: #64748b;">
                This link expires on ${expiresAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                If you weren't expecting this email, you can safely ignore it.
              </p>
            </div>
          </body>
          </html>
        `,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send review invitation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      reviewRequest: {
        id: reviewRequest.id,
        token: reviewRequest.token,
        reviewerEmail,
        reviewerName,
        expiresAt: expiresAt.toISOString(),
      },
      reviewUrl,
      emailSent,
      message: emailSent
        ? `Review invitation sent to ${reviewerEmail}`
        : `Review link created but email failed to send. Share the link manually: ${reviewUrl}`,
    });
  } catch (error) {
    console.error("Error sharing contract for review:", error);
    return NextResponse.json(
      { error: "Failed to share contract for review" },
      { status: 500 }
    );
  }
}

// GET - List all review requests for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch review requests
    const { data: reviewRequests, error: fetchError } = await supabase
      .from("review_requests")
      .select("*")
      .eq("contract_id", id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching review requests:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch review requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reviewRequests: reviewRequests || [],
    });
  } catch (error) {
    console.error("Error fetching review requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch review requests" },
      { status: 500 }
    );
  }
}
