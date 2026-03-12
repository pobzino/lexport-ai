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

    // Filter out the user's own email
    const userEmail = user.email?.toLowerCase();
    const extractedEmails = [...contactsMap.keys()].filter((e) => e !== userEmail);

    if (extractedEmails.length === 0) {
      return NextResponse.json({ success: true, created: 0, updated: 0, total: 0 });
    }

    // Batch fetch existing contacts in one query
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("id, email, usage_count")
      .eq("user_id", user.id)
      .in("email", extractedEmails);

    const existingByEmail = new Map(
      (existingContacts || []).map((c) => [c.email, c])
    );

    let created = 0;
    let updated = 0;
    const toInsert: Array<Record<string, unknown>> = [];
    const now = new Date().toISOString();

    for (const email of extractedEmails) {
      const contactData = contactsMap.get(email)!;
      const existing = existingByEmail.get(email);

      if (existing) {
        // Update existing contact
        await supabase
          .from("contacts")
          .update({
            name: contactData.name,
            company: contactData.company || null,
            role: contactData.role,
            usage_count: Math.max(existing.usage_count || 0, contactData.count),
            last_used_at: contactData.lastSeen,
            updated_at: now,
          })
          .eq("id", existing.id);
        updated++;
      } else {
        toInsert.push({
          user_id: user.id,
          name: contactData.name,
          email,
          company: contactData.company || null,
          role: contactData.role,
          usage_count: contactData.count,
          last_used_at: contactData.lastSeen,
        });
      }
    }

    // Batch insert new contacts
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("contacts")
        .insert(toInsert);

      if (insertError) {
        console.error("Error batch inserting contacts:", insertError);
      } else {
        created = toInsert.length;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: extractedEmails.length,
    });
  } catch (error) {
    console.error("Error in POST /api/contacts/sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
