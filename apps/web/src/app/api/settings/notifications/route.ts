import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NotificationType, NOTIFICATION_TYPE_INFO } from "@/lib/notifications";

// GET /api/settings/notifications - Get user's notification preferences
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's preferences
        const { data: preferences, error } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("user_id", user.id);

        if (error) {
            console.error("Error fetching notification preferences:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Build a complete preferences map with defaults
        const allTypes = Object.keys(NOTIFICATION_TYPE_INFO) as NotificationType[];
        const preferencesMap: Record<string, { email_enabled: boolean; in_app_enabled: boolean }> = {};

        // Set defaults (all enabled)
        for (const type of allTypes) {
            preferencesMap[type] = {
                email_enabled: true,
                in_app_enabled: true,
            };
        }

        // Override with user's saved preferences
        for (const pref of preferences || []) {
            preferencesMap[pref.notification_type] = {
                email_enabled: pref.email_enabled,
                in_app_enabled: pref.in_app_enabled,
            };
        }

        return NextResponse.json({
            preferences: preferencesMap,
            types: NOTIFICATION_TYPE_INFO,
        });
    } catch (error) {
        console.error("Error in notification preferences GET:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/settings/notifications - Update notification preferences
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { notification_type, email_enabled, in_app_enabled } = body;

        // Validate notification type
        if (!notification_type || !(notification_type in NOTIFICATION_TYPE_INFO)) {
            return NextResponse.json(
                { error: "Invalid notification type" },
                { status: 400 }
            );
        }

        // Build update object
        const updates: Record<string, unknown> = {
            user_id: user.id,
            notification_type,
            updated_at: new Date().toISOString(),
        };

        if (typeof email_enabled === "boolean") {
            updates.email_enabled = email_enabled;
        }
        if (typeof in_app_enabled === "boolean") {
            updates.in_app_enabled = in_app_enabled;
        }

        // Upsert the preference
        const { data, error } = await supabase
            .from("notification_preferences")
            .upsert(updates, {
                onConflict: "user_id,notification_type",
            })
            .select()
            .single();

        if (error) {
            console.error("Error updating notification preference:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ preference: data });
    } catch (error) {
        console.error("Error in notification preferences PATCH:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
