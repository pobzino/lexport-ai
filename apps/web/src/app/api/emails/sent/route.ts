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
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("sent_emails")
      .select("id, resend_email_id, from_address, to_addresses, subject, thread_id, status, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,to_addresses.cs.{${search}}`
      );
    }

    const { data: emails, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching sent emails:", error);
      return NextResponse.json(
        { error: "Failed to fetch sent emails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      emails: emails || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error in sent emails route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
