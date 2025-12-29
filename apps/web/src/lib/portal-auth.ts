import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const PORTAL_COOKIE_NAME = "portal_session";
const SESSION_DURATION_HOURS = 24 * 7; // 7 days

export interface PortalSession {
    email: string;
    token: string;
    expiresAt: Date;
}

/**
 * Generate a secure magic link token
 */
export function generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a magic link for portal login
 */
export async function createMagicLink(email: string): Promise<string> {
    const supabase = await createClient();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store in database
    const { error } = await supabase.from("portal_sessions").insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
    });

    if (error) {
        console.error("Error creating magic link:", error);
        throw new Error("Failed to create magic link");
    }

    return token;
}

/**
 * Validate a magic link token and create a session
 */
export async function validateMagicLink(token: string): Promise<{ email: string } | null> {
    const supabase = await createClient();

    // Find the session
    const { data: session, error } = await supabase
        .from("portal_sessions")
        .select("*")
        .eq("token", token)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (error || !session) {
        return null;
    }

    // Mark as verified
    await supabase
        .from("portal_sessions")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", session.id);

    return { email: session.email };
}

/**
 * Set portal session cookie
 */
export async function setPortalSession(email: string): Promise<void> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    const supabase = await createClient();
    await supabase.from("portal_sessions").insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
        verified_at: new Date().toISOString(), // Already verified
    });

    const cookieStore = await cookies();
    cookieStore.set(PORTAL_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });
}

/**
 * Get current portal session from cookies
 */
export async function getPortalSession(): Promise<{ email: string } | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const supabase = await createClient();
    const { data: session } = await supabase
        .from("portal_sessions")
        .select("email")
        .eq("token", token)
        .not("verified_at", "is", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (!session) {
        return null;
    }

    return { email: session.email };
}

/**
 * Clear portal session
 */
export async function clearPortalSession(): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_COOKIE_NAME)?.value;

    if (token) {
        const supabase = await createClient();
        await supabase.from("portal_sessions").delete().eq("token", token);
    }

    cookieStore.delete(PORTAL_COOKIE_NAME);
}

/**
 * Get all contracts for a portal user (by email)
 */
export async function getPortalContracts(email: string) {
    const supabase = await createClient();

    // Get all signature requests for this email
    const { data: signatureRequests } = await supabase
        .from("signature_requests")
        .select(`
      id,
      status,
      signer_name,
      signer_role,
      token,
      signed_at,
      contract:contracts (
        id,
        title,
        type,
        jurisdiction,
        status,
        content,
        created_at,
        updated_at,
        payment_required,
        payment_amount,
        payment_currency,
        payment_status
      )
    `)
        .eq("signer_email", email.toLowerCase())
        .order("created_at", { ascending: false });

    return signatureRequests || [];
}
