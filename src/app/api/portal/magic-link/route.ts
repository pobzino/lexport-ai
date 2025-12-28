import { NextRequest, NextResponse } from "next/server";
import { createMagicLink } from "@/lib/portal-auth";
import { createClient } from "@/lib/supabase/server";
import { sendMagicLinkEmail } from "@/lib/email";
import { checkRateLimit, getRateLimitKey, rateLimitConfigs } from "@/lib/security";

export async function POST(request: NextRequest) {
    try {
        // Rate limiting - 3 requests per minute
        const rateLimitKey = getRateLimitKey(request, "magic-link");
        const rateLimit = checkRateLimit(rateLimitKey, rateLimitConfigs.magicLink);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
                        "X-RateLimit-Remaining": "0",
                    }
                }
            );
        }

        const { email } = await request.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if this email has any signature requests
        const supabase = await createClient();
        const { data: requests } = await supabase
            .from("signature_requests")
            .select("id")
            .eq("signer_email", email.toLowerCase())
            .limit(1);

        if (!requests || requests.length === 0) {
            // Don't reveal whether email exists - just say we sent it
            // But actually don't send anything
            return NextResponse.json({
                success: true,
                message: "If you have contracts, you will receive an email shortly",
            });
        }

        // Create magic link
        const token = await createMagicLink(email);

        // Get the base URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`;
        const magicLinkUrl = `${baseUrl}/portal/verify?token=${token}`;

        // Send email with magic link
        try {
            await sendMagicLinkEmail({
                to: email,
                magicLinkUrl,
            });
        } catch (emailError) {
            console.error("Failed to send magic link email:", emailError);
            // In development, still return the link for testing
            if (process.env.NODE_ENV === "development") {
                return NextResponse.json({
                    success: true,
                    message: "Magic link created (email failed)",
                    devMagicLink: magicLinkUrl,
                });
            }
            return NextResponse.json(
                { error: "Failed to send email" },
                { status: 500 }
            );
        }

        // In development, also return the link for testing
        if (process.env.NODE_ENV === "development") {
            return NextResponse.json({
                success: true,
                message: "Magic link sent",
                devMagicLink: magicLinkUrl,
            });
        }

        return NextResponse.json({
            success: true,
            message: "If you have contracts, you will receive an email shortly",
        });
    } catch (error) {
        console.error("Magic link error:", error);
        return NextResponse.json(
            { error: "Failed to send magic link" },
            { status: 500 }
        );
    }
}
