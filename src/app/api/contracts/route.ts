import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/contracts - List contracts for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("contracts")
      .select("id, title, type, status, jurisdiction, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    // Handle status filter
    if (status) {
      if (status === "ready_to_send") {
        // For bulk send, show draft contracts that can be used as templates
        query = query.eq("status", "draft");
      } else {
        query = query.eq("status", status);
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: contracts, error } = await query;

    if (error) {
      console.error("Error fetching contracts:", error);
      return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
    }

    return NextResponse.json({ contracts: contracts || [] });
  } catch (error) {
    console.error("Error in GET /api/contracts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
