import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const searchParamsSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(), // comma-separated
  jurisdiction: z.string().optional(),
  folderId: z.string().uuid().optional(),
  tagIds: z.string().optional(), // comma-separated UUIDs
  dateFrom: z.string().optional(), // ISO date
  dateTo: z.string().optional(), // ISO date
  sortBy: z.enum(["relevance", "date", "title"]).default("relevance"),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = searchParamsSchema.parse(searchParams);

    // Build the base query
    let query = supabase
      .from("contracts")
      .select(
        `
        id,
        title,
        type,
        jurisdiction,
        status,
        content,
        created_at,
        updated_at,
        folders:contract_folders(folder_id, folder:folders(id, name, color)),
        tags:contract_tags(tag_id, tag:tags(id, name, color))
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id);

    // Full-text search if query provided
    if (params.q && params.q.trim()) {
      // Use plainto_tsquery for simple Google-like search
      const searchQuery = params.q.trim();
      
      // We need to use rpc for complex queries with ranking
      const { data, error, count } = await supabase.rpc("search_contracts", {
        search_query: searchQuery,
        user_id_filter: user.id,
        status_filter: params.status ? params.status.split(",") : null,
        jurisdiction_filter: params.jurisdiction || null,
        folder_id_filter: params.folderId || null,
        tag_ids_filter: params.tagIds ? params.tagIds.split(",") : null,
        date_from_filter: params.dateFrom || null,
        date_to_filter: params.dateTo || null,
        sort_by: params.sortBy,
        result_limit: params.limit,
        result_offset: params.offset,
      });

      if (error) {
        // Fallback to simple search if RPC doesn't exist yet
        console.warn("RPC search_contracts not available, using fallback");
        return await fallbackSearch(supabase, user.id, params);
      }

      return NextResponse.json({
        contracts: data || [],
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
      });
    }

    // Apply filters for non-search queries
    if (params.status) {
      const statuses = params.status.split(",");
      query = query.in("status", statuses);
    }

    if (params.jurisdiction) {
      query = query.eq("jurisdiction", params.jurisdiction);
    }

    if (params.folderId) {
      query = query.contains("contract_folders", { folder_id: params.folderId });
    }

    if (params.tagIds) {
      const tagIds = params.tagIds.split(",");
      // Filter contracts that have at least one of the specified tags
      const { data: contractsWithTags } = await supabase
        .from("contract_tags")
        .select("contract_id")
        .in("tag_id", tagIds);

      if (contractsWithTags) {
        const contractIds = contractsWithTags.map((ct) => ct.contract_id);
        if (contractIds.length > 0) {
          query = query.in("id", contractIds);
        } else {
          // No contracts with these tags
          return NextResponse.json({
            contracts: [],
            total: 0,
            limit: params.limit,
            offset: params.offset,
          });
        }
      }
    }

    if (params.dateFrom) {
      query = query.gte("created_at", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.lte("created_at", params.dateTo);
    }

    // Apply sorting
    if (params.sortBy === "date") {
      query = query.order("created_at", { ascending: false });
    } else if (params.sortBy === "title") {
      query = query.order("title", { ascending: true });
    } else {
      // Default to date for non-search queries
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Failed to search contracts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contracts: data || [],
      total: count || 0,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    console.error("Search error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fallback search function using simple ILIKE queries
async function fallbackSearch(
  supabase: any,
  userId: string,
  params: z.infer<typeof searchParamsSchema>
) {
  let query = supabase
    .from("contracts")
    .select(
      `
      id,
      title,
      type,
      jurisdiction,
      status,
      content,
      created_at,
      updated_at,
      folders:contract_folders(folder_id, folder:folders(id, name, color)),
      tags:contract_tags(tag_id, tag:tags(id, name, color))
    `,
      { count: "exact" }
    )
    .eq("user_id", userId);

  // Simple text search using ILIKE
  if (params.q && params.q.trim()) {
    query = query.or(
      `title.ilike.%${params.q}%,type.ilike.%${params.q}%,jurisdiction.ilike.%${params.q}%`
    );
  }

  // Apply other filters
  if (params.status) {
    query = query.in("status", params.status.split(","));
  }

  if (params.jurisdiction) {
    query = query.eq("jurisdiction", params.jurisdiction);
  }

  if (params.dateFrom) {
    query = query.gte("created_at", params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte("created_at", params.dateTo);
  }

  // Sorting
  if (params.sortBy === "title") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return NextResponse.json({
    contracts: data || [],
    total: count || 0,
    limit: params.limit,
    offset: params.offset,
  });
}
