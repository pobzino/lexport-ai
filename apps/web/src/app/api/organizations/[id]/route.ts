import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/organizations/[id] - Get organization details
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

        // Get org with members
        const { data: org, error } = await supabase
            .from("organizations")
            .select(`
        *,
        members:organization_members(
          id,
          role,
          joined_at,
          user:auth.users(id, email, raw_user_meta_data)
        )
      `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching organization:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            organization: org,
            currentUserRole: membership.role
        });
    } catch (error) {
        console.error("Error in organization GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/organizations/[id] - Update organization
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
        const { name, logo_url, settings } = body;

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name) updateData.name = name.trim();
        if (logo_url !== undefined) updateData.logo_url = logo_url;
        if (settings) updateData.settings = settings;

        const { data, error } = await supabase
            .from("organizations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating organization:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ organization: data });
    } catch (error) {
        console.error("Error in organization PATCH:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/organizations/[id] - Delete organization
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check owner access
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", id)
            .eq("user_id", user.id)
            .single();

        if (!membership || membership.role !== "owner") {
            return NextResponse.json({ error: "Only the owner can delete the organization" }, { status: 403 });
        }

        const { error } = await supabase
            .from("organizations")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting organization:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in organization DELETE:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
