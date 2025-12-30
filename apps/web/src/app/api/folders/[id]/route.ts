import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/folders/[id] - Get folder details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("folders")
            .select(`
        *,
        contracts:contracts(id, title, status, created_at)
      `)
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error) {
            console.error("Error fetching folder:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        return NextResponse.json({ folder: data });
    } catch (error) {
        console.error("Error in folder GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/folders/[id] - Update folder
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, color, icon } = body;

        const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
        if (name) updateData.name = name.trim();
        if (color) updateData.color = color;
        if (icon) updateData.icon = icon;

        const { data, error } = await supabase
            .from("folders")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating folder:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folder: data });
    } catch (error) {
        console.error("Error in folder PATCH:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/folders/[id] - Delete folder
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // First, unassign contracts from this folder
        await supabase
            .from("contracts")
            .update({ folder_id: null })
            .eq("folder_id", id);

        const { error } = await supabase
            .from("folders")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting folder:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in folder DELETE:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
