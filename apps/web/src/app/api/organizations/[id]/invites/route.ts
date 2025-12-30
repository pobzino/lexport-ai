import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTeamInviteEmail } from "@/lib/email";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/organizations/[id]/invites - Get pending invites
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check admin access
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", id)
            .eq("user_id", user.id)
            .single();

        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from("organization_invites")
            .select("*")
            .eq("organization_id", id)
            .is("accepted_at", null)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching invites:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ invites: data });
    } catch (error) {
        console.error("Error in invites GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/organizations/[id]/invites - Create an invite
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check admin access
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", id)
            .eq("user_id", user.id)
            .single();

        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { email, role = "member" } = body;

        if (!email?.trim()) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Check if already a member
        const { data: existingUsers } = await supabase
            .from("auth.users")
            .select("id")
            .eq("email", email.toLowerCase())
            .single();

        if (existingUsers) {
            const { data: existingMember } = await supabase
                .from("organization_members")
                .select("id")
                .eq("organization_id", id)
                .eq("user_id", existingUsers.id)
                .single();

            if (existingMember) {
                return NextResponse.json({ error: "User is already a member" }, { status: 409 });
            }
        }

        // Create invite
        const { data: invite, error } = await supabase
            .from("organization_invites")
            .insert({
                organization_id: id,
                email: email.toLowerCase().trim(),
                role,
                invited_by: user.id,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "An invite has already been sent to this email" }, { status: 409 });
            }
            console.error("Error creating invite:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get org name for email
        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", id)
            .single();

        // Send invite email
        try {
            await sendTeamInviteEmail({
                to: email,
                inviterName: user.user_metadata?.full_name || user.email || "A team member",
                organizationName: org?.name || "the team",
                inviteToken: invite.token,
                role,
            });
        } catch (emailError) {
            console.error("Error sending invite email:", emailError);
            // Don't fail the request, invite is still created
        }

        return NextResponse.json({ invite }, { status: 201 });
    } catch (error) {
        console.error("Error in invites POST:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/organizations/[id]/invites?invite_id=xxx - Cancel an invite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const inviteId = searchParams.get("invite_id");

        if (!inviteId) {
            return NextResponse.json({ error: "invite_id is required" }, { status: 400 });
        }

        // Check admin access
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", id)
            .eq("user_id", user.id)
            .single();

        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { error } = await supabase
            .from("organization_invites")
            .delete()
            .eq("id", inviteId)
            .eq("organization_id", id);

        if (error) {
            console.error("Error canceling invite:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in invites DELETE:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
