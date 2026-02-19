import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * @swagger
 * /api/contracts:
 *   get:
 *     summary: List contracts
 *     description: Retrieve a list of contracts for the current user
 *     tags: [Contracts]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, signed, expired, cancelled]
 *         description: Filter contracts by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contracts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const folderId = searchParams.get("folderId");
    const uncategorized = searchParams.get("uncategorized");
    const tags = searchParams.get("tags");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("contracts")
      .select(`
        id, 
        title, 
        type, 
        status, 
        jurisdiction, 
        created_at, 
        updated_at,
        folder_id,
        contract_tags(tag_id, tags(id, name, color))
      `)
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

    // Handle folder filter
    if (folderId) {
      query = query.eq("folder_id", folderId);
    } else if (uncategorized === "true") {
      query = query.is("folder_id", null);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: contracts, error } = await query;

    if (error) {
      console.error("Error fetching contracts:", error);
      return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
    }

    // Transform contract_tags structure for easier frontend use
    let transformedContracts = (contracts || []).map((contract: any) => ({
      ...contract,
      tags: (contract.contract_tags || [])
        .map((ct: any) => ct.tags)
        .filter((tag: any) => tag), // Filter out any null tags
    }));

    // Filter by tags if specified
    if (tags) {
      const tagIds = tags.split(",");
      transformedContracts = transformedContracts.filter((contract: any) => {
        const contractTagIds = contract.tags.map((t: any) => t.id);
        return tagIds.every((tagId) => contractTagIds.includes(tagId));
      });
    }

    return NextResponse.json({ contracts: transformedContracts });
  } catch (error) {
    console.error("Error in GET /api/contracts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
