import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/invites/accept - Accept an invite
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Please sign in to accept this invite" }, { status: 401 });
        }

        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
        }

        // Find the invite
        const { data: invite, error: inviteError } = await supabase
            .from("organization_invites")
            .select("*")
            .eq("token", token)
            .is("accepted_at", null)
            .single();

        if (inviteError || !invite) {
            return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
        }

        // Check invite hasn't expired
        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
        }

        // Check email matches (case insensitive)
        if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
            return NextResponse.json({
                error: "This invite was sent to a different email address"
            }, { status: 403 });
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from("organization_members")
            .select("id")
            .eq("organization_id", invite.organization_id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            return NextResponse.json({
                error: "You are already a member of this organization",
                organization_id: invite.organization_id
            }, { status: 409 });
        }

        // Add user to organization
        const { error: memberError } = await supabase
            .from("organization_members")
            .insert({
                organization_id: invite.organization_id,
                user_id: user.id,
                role: invite.role,
            });

        if (memberError) {
            console.error("Error adding member:", memberError);
            return NextResponse.json({ error: memberError.message }, { status: 500 });
        }

        // Mark invite as accepted
        await supabase
            .from("organization_invites")
            .update({ accepted_at: new Date().toISOString() })
            .eq("id", invite.id);

        // Get org details for response
        const { data: org } = await supabase
            .from("organizations")
            .select("id, name, slug")
            .eq("id", invite.organization_id)
            .single();

        return NextResponse.json({
            success: true,
            organization: org,
            role: invite.role
        });
    } catch (error) {
        console.error("Error in invite accept:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/invites/accept?token=xxx - Get invite details
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const supabase = await createClient();

        const { data: invite, error } = await supabase
            .from("organization_invites")
            .select(`
        id,
        email,
        role,
        expires_at,
        accepted_at,
        organization:organizations(id, name, logo_url)
      `)
            .eq("token", token)
            .single();

        if (error || !invite) {
            return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
        }

        if (invite.accepted_at) {
            return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
        }

        return NextResponse.json({ invite });
    } catch (error) {
        console.error("Error fetching invite:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
