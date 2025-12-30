import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/organizations/[id]/members - Get organization members
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check membership
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", id)
            .eq("user_id", user.id)
            .single();

        if (!membership) {
            return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from("organization_members")
            .select(`
        id,
        role,
        joined_at,
        user_id
      `)
            .eq("organization_id", id)
            .order("joined_at");

        if (error) {
            console.error("Error fetching members:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ members: data });
    } catch (error) {
        console.error("Error in members GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/organizations/[id]/members - Update a member's role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        const { member_id, role } = body;

        if (!member_id || !role) {
            return NextResponse.json({ error: "member_id and role are required" }, { status: 400 });
        }

        // Can't change owner role
        const { data: targetMember } = await supabase
            .from("organization_members")
            .select("role")
            .eq("id", member_id)
            .single();

        if (targetMember?.role === "owner") {
            return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("organization_members")
            .update({ role })
            .eq("id", member_id)
            .eq("organization_id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating member:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ member: data });
    } catch (error) {
        console.error("Error in members PATCH:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/organizations/[id]/members - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const memberId = searchParams.get("member_id");

        if (!memberId) {
            return NextResponse.json({ error: "member_id is required" }, { status: 400 });
        }

        // Check admin access (or self-removal)
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", id)
            .eq("user_id", user.id)
            .single();

        const { data: targetMember } = await supabase
            .from("organization_members")
            .select("role, user_id")
            .eq("id", memberId)
            .single();

        const isSelfRemoval = targetMember?.user_id === user.id;
        const isAdmin = membership && ["owner", "admin"].includes(membership.role);

        if (!isSelfRemoval && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (targetMember?.role === "owner") {
            return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
        }

        const { error } = await supabase
            .from("organization_members")
            .delete()
            .eq("id", memberId)
            .eq("organization_id", id);

        if (error) {
            console.error("Error removing member:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in members DELETE:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
