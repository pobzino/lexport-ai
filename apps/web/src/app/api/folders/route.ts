import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/folders - Get user's folders
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("folders")
            .select(`
        *,
        contracts!folder_id(count)
      `)
            .eq("user_id", user.id)
            .order("name");

        if (error) {
            console.error("Error fetching folders:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folders: data });
    } catch (error) {
        console.error("Error in folders GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/folders - Create a folder
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, color, icon, parent_id } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("folders")
            .insert({
                user_id: user.id,
                name: name.trim(),
                color: color || "#529ec6",
                icon: icon || "folder",
                parent_id: parent_id || null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "A folder with this name already exists" }, { status: 409 });
            }
            console.error("Error creating folder:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folder: data }, { status: 201 });
    } catch (error) {
        console.error("Error in folders POST:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
