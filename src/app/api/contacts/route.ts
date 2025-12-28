import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  phone?: string;
  address?: Record<string, string>;
  notes?: string;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

// GET /api/contacts - List contacts with optional search
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const role = searchParams.get("role");

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("usage_count", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Apply role filter
    if (role) {
      query = query.eq("role", role);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error("Error fetching contacts:", error);
      return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
    }

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error in GET /api/contacts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, company, role, phone, address, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if contact with this email already exists for this user
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      // Update existing contact instead
      const { data: contact, error } = await supabase
        .from("contacts")
        .update({
          name,
          company,
          role,
          phone,
          address,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating contact:", error);
        return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
      }

      return NextResponse.json({ contact, updated: true });
    }

    // Create new contact
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name,
        email: email.toLowerCase(),
        company,
        role,
        phone,
        address,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contact:", error);
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/contacts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
