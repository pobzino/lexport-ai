import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomBytes } from "crypto";

// Request schema
const SendRequestSchema = z.object({
  signers: z.array(
    z.object({
      name: z.string().min(1, "Name required"),
      email: z.string().email("Valid email required"),
      role: z.string().optional(),
    })
  ).min(1, "At least one signer required"),
  message: z.string().optional(),
  expiresInDays: z.number().min(1).max(90).default(14),
  requireSequentialSigning: z.boolean().default(false),
  reminderEnabled: z.boolean().default(true),
  reminderIntervalDays: z.number().min(1).max(14).default(3),
});

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
    const parseResult = SendRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      signers,
      message,
      expiresInDays,
      requireSequentialSigning,
      reminderEnabled,
      reminderIntervalDays,
    } = parseResult.data;

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

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create signature requests for each signer
    const signatureRequestsData = signers.map((signer, index) => ({
      contract_id: id,
      signer_email: signer.email,
      signer_name: signer.name,
      signer_role: signer.role,
      token: randomBytes(32).toString("hex"),
      status: "pending",
      order: index + 1,
      expires_at: expiresAt.toISOString(),
      message,
    }));

    const { data: createdRequests, error: insertError } = await supabase
      .from("signature_requests")
      .insert(signatureRequestsData)
      .select();

    if (insertError) {
      console.error("Error creating signature requests:", insertError);
      return NextResponse.json(
        { error: "Failed to create signature requests" },
        { status: 500 }
      );
    }

    // Calculate next reminder time
    const nextReminderAt = reminderEnabled
      ? new Date(Date.now() + reminderIntervalDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Update contract status and settings
    await supabase
      .from("contracts")
      .update({
        status: "pending_signature",
        require_sequential_signing: requireSequentialSigning,
        reminder_enabled: reminderEnabled,
        reminder_interval_days: reminderIntervalDays,
        next_reminder_at: nextReminderAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // TODO: Send email notifications to signers
    // For now, we'll return the signing URLs

    const signingUrls = (createdRequests || []).map((req) => ({
      email: req.signer_email,
      name: req.signer_name,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3500"}/sign/${req.token}`,
      expiresAt: req.expires_at,
    }));

    return NextResponse.json({
      success: true,
      message: `Signature requests sent to ${signers.length} signer(s)`,
      signingUrls,
    });
  } catch (error) {
    console.error("Error sending contract for signature:", error);
    return NextResponse.json(
      { error: "Failed to send contract for signature" },
      { status: 500 }
    );
  }
}
