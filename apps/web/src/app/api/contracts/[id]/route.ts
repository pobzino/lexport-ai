import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChangeSummary, hasChanges } from "@/lib/version-diff";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";
import type { ContractContent, VersionChangeType } from "@/db/types";

// GET - Fetch a single contract with signature data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch contract
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch signature fields
    const { data: signatureFields } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", id)
      .order("order", { ascending: true });

    // Fetch signature requests with their status
    const { data: signatureRequests } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("contract_id", id)
      .order("order", { ascending: true });

    // Fetch actual signatures
    const { data: signatures } = await supabase
      .from("signatures")
      .select("*")
      .eq("contract_id", id);

    // Fetch field values (completed fields)
    const { data: fieldValues } = await supabase
      .from("field_values")
      .select("*")
      .in(
        "field_id",
        (signatureFields || []).map((f) => f.id)
      );

    // Log contract view
    const context = getRequestContextFromRequest(request);
    await auditLogger.contractViewed(
      id,
      user.id,
      user.email || null,
      user.user_metadata?.name || user.user_metadata?.full_name || null,
      context
    );

    return NextResponse.json({
      contract,
      signatureFields: signatureFields || [],
      signatureRequests: signatureRequests || [],
      signatures: signatures || [],
      fieldValues: fieldValues || [],
    });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

// PATCH - Update a contract
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("PATCH - Auth user:", user?.id, "Contract ID:", id);

    if (authError || !user) {
      console.log("PATCH - Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("PATCH - Request body:", JSON.stringify(body, null, 2));

    // Get the current contract state before update (for version history)
    const { data: currentContract, error: fetchError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !currentContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if contract is locked (not in draft status)
    // Contracts become locked once sent for signature to maintain document integrity
    const lockedStatuses = ["pending_signature", "signed", "completed", "expired"];
    if (lockedStatuses.includes(currentContract.status)) {
      // Allow only specific fields to be updated on locked contracts (e.g., reminder settings)
      const allowedFieldsWhenLocked = ["reminder_enabled", "reminder_days", "reminder_frequency"];
      const requestedFields = Object.keys(body);
      const hasDisallowedFields = requestedFields.some(
        (field) => !allowedFieldsWhenLocked.includes(field)
      );

      if (hasDisallowedFields) {
        return NextResponse.json(
          {
            error: "Contract is locked",
            message: "This contract has been sent for signature and cannot be edited. Only reminder settings can be modified.",
            status: currentContract.status,
            lockedAt: currentContract.sent_at || currentContract.updated_at,
          },
          { status: 403 }
        );
      }
    }

    // Determine if content has changed (for version history)
    const oldContent = currentContract.content as ContractContent;
    const newContent = body.content as ContractContent | undefined;
    const contentChanged = newContent && hasChanges(oldContent, newContent);

    // Determine change type based on request headers or body
    const changeType: VersionChangeType =
      body.changeType ||
      (body.aiModified ? "ai_modification" : "edit");

    // Ensure version is a number, default to 1 if not provided
    const updateData: Record<string, unknown> = {
      ...body,
      version: body.version || 1,
      updated_at: new Date().toISOString(),
    };

    // Remove non-database fields
    delete updateData.changeType;
    delete updateData.aiModified;

    // Smart cache invalidation: only remove changed clauses from section_explanations
    if (contentChanged && newContent && oldContent) {
      const changedClauseIds = new Set<string>();

      // Find clauses that were modified or removed
      const newClauseIds = new Set((newContent.clauses || []).map((c: { id: string }) => c.id));
      for (const oldClause of (oldContent.clauses || [])) {
        const newClause = (newContent.clauses || []).find((c: { id: string }) => c.id === oldClause.id);
        if (!newClause) {
          // Clause was removed
          changedClauseIds.add(oldClause.id);
        } else if (newClause.content !== oldClause.content || newClause.title !== oldClause.title) {
          // Clause content or title changed
          changedClauseIds.add(oldClause.id);
        }
      }

      // Find new clauses that were added
      const oldClauseIds = new Set((oldContent.clauses || []).map((c: { id: string }) => c.id));
      for (const newClause of (newContent.clauses || [])) {
        if (!oldClauseIds.has(newClause.id)) {
          changedClauseIds.add(newClause.id);
        }
      }

      // Update section_explanations cache - remove only changed clauses
      if (changedClauseIds.size > 0 && currentContract.section_explanations) {
        try {
          const existingCache = typeof currentContract.section_explanations === 'string'
            ? JSON.parse(currentContract.section_explanations)
            : currentContract.section_explanations;
          // Remove only the changed clause IDs from cache
          for (const clauseId of changedClauseIds) {
            delete existingCache[clauseId];
          }
          updateData.section_explanations = Object.keys(existingCache).length > 0 ? existingCache : null;
        } catch {
          updateData.section_explanations = null;
        }
      } else if (changedClauseIds.size > 0) {
        // No existing cache, nothing to update
        updateData.section_explanations = null;
      }
    }

    console.log("PATCH - Update data:", JSON.stringify(updateData, null, 2));

    // Update contract (Supabase RLS handles ownership)
    const { data: updated, error } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    console.log("PATCH - Update result:", updated ? "success" : "failed", "Error:", error);

    if (error || !updated) {
      return NextResponse.json({ error: "Contract not found", details: error?.message }, { status: 404 });
    }

    // Create version history entry if content changed
    if (contentChanged && newContent) {
      try {
        const changeSummary = generateChangeSummary(oldContent, newContent);

        // Insert version snapshot of the OLD state before the change
        const { error: versionError } = await supabase
          .from("contract_versions")
          .insert({
            contract_id: id,
            version_number: currentContract.version,
            content: oldContent,
            metadata: currentContract.metadata,
            change_summary: changeSummary,
            change_type: changeType,
            created_by: user.id,
          });

        if (versionError) {
          // Log but don't fail the update - version history is secondary
          console.error("Error creating version snapshot:", versionError);
        } else {
          console.log("Created version snapshot for version", currentContract.version);
        }
      } catch (versionErr) {
        console.error("Error in version history creation:", versionErr);
      }
    }

    // Log audit event for contract update
    const context = getRequestContextFromRequest(request);
    const affectedFields = Object.keys(body).filter((key) => key !== "version");
    await auditLogger.contractUpdated(
      id,
      user.id,
      user.email || "",
      user.user_metadata?.name || user.user_metadata?.full_name || null,
      affectedFields,
      contentChanged ? { content: oldContent } : undefined,
      contentChanged && newContent ? { content: newContent } : undefined,
      context
    );

    return NextResponse.json({ contract: updated });
  } catch (error) {
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contract
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
