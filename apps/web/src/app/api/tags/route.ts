import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tags - Get user's tags
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("tags")
            .select(`
        *,
        contract_tags(count)
      `)
            .eq("user_id", user.id)
            .order("name");

        if (error) {
            console.error("Error fetching tags:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ tags: data });
    } catch (error) {
        console.error("Error in tags GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/tags - Create a tag
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, color } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("tags")
            .insert({
                user_id: user.id,
                name: name.trim(),
                color: color || "#202e46",
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
            }
            console.error("Error creating tag:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ tag: data }, { status: 201 });
    } catch (error) {
        console.error("Error in tags POST:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
