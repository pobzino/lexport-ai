import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get current authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Get user profile from database
    const { data: profile } = await supabase
      .from("users")
      .select("id, name, email, image, role")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: profile || {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || null,
        image: user.user_metadata?.avatar_url || null,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
