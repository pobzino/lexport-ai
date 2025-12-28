import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  company_name: z.string().optional(),
  job_title: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  default_jurisdiction: z.string().optional(),
});

// GET /api/profile - Get user profile
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile from users table
    const { data: profile, error } = await supabase
      .from("users")
      .select("id, name, email, company_name, job_title, address, phone, default_jurisdiction")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile: {
        ...profile,
        // Also include auth metadata name if users table name is null
        name: profile?.name || user.user_metadata?.full_name || null,
        email: profile?.email || user.email,
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = UpdateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = {
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    };

    // Update user profile
    const { data: profile, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("id, name, email, company_name, job_title, address, phone, default_jurisdiction")
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // Also update auth metadata if name changed
    if (parseResult.data.name) {
      await supabase.auth.updateUser({
        data: { full_name: parseResult.data.name },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
