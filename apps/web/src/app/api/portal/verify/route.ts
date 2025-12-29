import { NextRequest, NextResponse } from "next/server";
import { validateMagicLink, setPortalSession } from "@/lib/portal-auth";

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token || typeof token !== "string") {
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 }
            );
        }

        // Validate the magic link
        const result = await validateMagicLink(token);

        if (!result) {
            return NextResponse.json(
                { error: "Invalid or expired link" },
                { status: 400 }
            );
        }

        // Create the session
        await setPortalSession(result.email);

        return NextResponse.json({
            success: true,
            email: result.email,
        });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json(
            { error: "Verification failed" },
            { status: 500 }
        );
    }
}
