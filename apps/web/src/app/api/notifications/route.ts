import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20");
        const unreadOnly = searchParams.get("unread") === "true";

        let query = supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq("read", false);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching notifications:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ notifications: data });
    } catch (error) {
        console.error("Error in notifications GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/notifications - Create a notification (internal use)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        const { user_id, type, title, message, contract_id, data } = body;

        if (!user_id || !type || !title || !message) {
            return NextResponse.json(
                { error: "Missing required fields: user_id, type, title, message" },
                { status: 400 }
            );
        }

        const { data: notification, error } = await supabase
            .from("notifications")
            .insert({
                user_id,
                type,
                title,
                message,
                contract_id: contract_id || null,
                data: data || {},
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating notification:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ notification }, { status: 201 });
    } catch (error) {
        console.error("Error in notifications POST:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
