import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data: drafts, count, error } = await supabase
      .from("email_drafts")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching drafts:", error);
      return NextResponse.json(
        { error: "Failed to fetch drafts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      drafts: drafts || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error in drafts route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data: draft, error } = await supabase
      .from("email_drafts")
      .insert({
        user_id: user.id,
        to_addresses: body.to_addresses || [],
        subject: body.subject || "",
        body: body.body || "",
        reply_to_received_email_id: body.reply_to_received_email_id || null,
        thread_id: body.thread_id || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating draft:", error);
      return NextResponse.json(
        { error: "Failed to create draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: draft.id });
  } catch (error) {
    console.error("Error in create draft route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
