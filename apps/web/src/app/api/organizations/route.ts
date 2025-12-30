import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/organizations - Get user's organizations
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("organization_members")
            .select(`
        role,
        joined_at,
        organization:organizations(
          id,
          name,
          slug,
          logo_url,
          plan,
          created_at
        )
      `)
            .eq("user_id", user.id);

        if (error) {
            console.error("Error fetching organizations:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const organizations = data?.map(m => ({
            ...m.organization,
            role: m.role,
            joined_at: m.joined_at,
        })) || [];

        return NextResponse.json({ organizations });
    } catch (error) {
        console.error("Error in organizations GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/organizations - Create an organization
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            + "-" + Math.random().toString(36).substring(2, 8);

        // Create org with owner
        const { data: orgId, error: createError } = await supabase
            .rpc("create_organization_with_owner", {
                p_name: name.trim(),
                p_slug: slug,
                p_user_id: user.id,
            });

        if (createError) {
            console.error("Error creating organization:", createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        // Fetch the created org
        const { data: org, error: fetchError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", orgId)
            .single();

        if (fetchError) {
            console.error("Error fetching organization:", fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        return NextResponse.json({ organization: org }, { status: 201 });
    } catch (error) {
        console.error("Error in organizations POST:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
