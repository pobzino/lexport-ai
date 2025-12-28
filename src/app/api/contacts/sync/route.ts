import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/contacts/sync - Extract contacts from past contracts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all contracts for this user
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("id, type, content, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
    }

    // Extract unique contacts from contracts
    const contactsMap = new Map<string, {
      name: string;
      email: string;
      company?: string;
      role?: string;
      count: number;
      lastSeen: string;
    }>();

    for (const contract of contracts || []) {
      const content = contract.content || {};
      const metadata = contract.metadata || {};

      // Extract parties from various contract structures
      const partyFields = [
        "disclosingParty",
        "receivingParty",
        "client",
        "contractor",
        "consultant",
        "freelancer",
        "company",
        "investor",
        "partyA",
        "partyB",
      ];

      for (const field of partyFields) {
        const party = content[field] || metadata[field];
        if (party && party.email) {
          const email = party.email.toLowerCase();
          const existing = contactsMap.get(email);

          if (existing) {
            existing.count++;
            if (new Date(contract.created_at) > new Date(existing.lastSeen)) {
              existing.lastSeen = contract.created_at;
              // Update with most recent info
              if (party.name) existing.name = party.name;
              if (party.company) existing.company = party.company;
            }
          } else {
            contactsMap.set(email, {
              name: party.name || email.split("@")[0],
              email,
              company: party.company,
              role: party.role || field.replace(/([A-Z])/g, " $1").trim().toLowerCase(),
              count: 1,
              lastSeen: contract.created_at,
            });
          }
        }
      }

      // Also check for parties array in content
      if (Array.isArray(content.parties)) {
        for (const party of content.parties) {
          if (party && party.email) {
            const email = party.email.toLowerCase();
            const existing = contactsMap.get(email);

            if (existing) {
              existing.count++;
            } else {
              contactsMap.set(email, {
                name: party.name || email.split("@")[0],
                email,
                company: party.company,
                role: party.role,
                count: 1,
                lastSeen: contract.created_at,
              });
            }
          }
        }
      }
    }

    // Insert or update contacts
    let created = 0;
    let updated = 0;

    for (const [email, contactData] of contactsMap) {
      // Skip the user's own email
      if (email === user.email?.toLowerCase()) continue;

      // Check if contact exists
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("email", email)
        .single();

      if (existing) {
        // Update existing contact
        await supabase
          .from("contacts")
          .update({
            name: contactData.name,
            company: contactData.company,
            role: contactData.role,
            usage_count: Math.max(existing.usage_count, contactData.count),
            last_used_at: contactData.lastSeen,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        updated++;
      } else {
        // Create new contact
        await supabase
          .from("contacts")
          .insert({
            user_id: user.id,
            name: contactData.name,
            email,
            company: contactData.company,
            role: contactData.role,
            usage_count: contactData.count,
            last_used_at: contactData.lastSeen,
          });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: contactsMap.size,
    });
  } catch (error) {
    console.error("Error in POST /api/contacts/sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
