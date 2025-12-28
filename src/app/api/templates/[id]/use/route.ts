import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { replaceAllPlaceholders, extractPlaceholders } from "@/lib/contracts/placeholders";

const UseTemplateSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  placeholderValues: z.record(z.string(), z.string()).optional(),
});

// Helper to get signer roles based on contract type
function getSignerRoles(contractType: string): string[] {
  switch (contractType) {
    case "nda_mutual":
    case "nda_one_way":
      return ["Disclosing Party", "Receiving Party"];
    case "independent_contractor":
      return ["Company", "Contractor"];
    case "consulting_agreement":
      return ["Client", "Consultant"];
    case "safe_note":
      return ["Company", "Investor"];
    case "freelance_service":
      return ["Client", "Freelancer"];
    default:
      return ["Party 1", "Party 2"];
  }
}

// POST /api/templates/[id]/use - Create contract from template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional body
    const body = await request.json().catch(() => ({}));
    const parseResult = UseTemplateSchema.safeParse(body);
    const { title: customTitle, metadata: customMetadata, placeholderValues } = parseResult.success
      ? parseResult.data
      : { title: undefined, metadata: undefined, placeholderValues: undefined };

    // Check if this is a system template (ID starts with "system_")
    const isSystemTemplate = id.startsWith("system_");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let templateData: {
      id: string;
      name: string;
      type: string;
      jurisdiction: string;
      content: Record<string, any>;
    };

    if (isSystemTemplate) {
      // Extract actual ID from system template
      const systemId = id.replace("system_", "");

      // Get system template from contract_templates table
      const { data: systemTemplate, error: systemError } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("id", systemId)
        .eq("is_active", true)
        .single();

      if (systemError || !systemTemplate) {
        return NextResponse.json({ error: "System template not found" }, { status: 404 });
      }

      // Map system template to expected structure
      templateData = {
        id: id,
        name: systemTemplate.title,
        type: systemTemplate.contract_type,
        jurisdiction: systemTemplate.jurisdiction,
        content: {
          preamble: systemTemplate.preamble,
          recitals: systemTemplate.recitals,
          clauses: systemTemplate.clauses,
          signatureBlock: systemTemplate.signature_block,
          placeholders: systemTemplate.placeholders,
        },
      };
    } else {
      // Get user template (must be owned by user or public)
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .or(`created_by_id.eq.${user.id},is_public.eq.true`)
        .single();

      if (templateError || !template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      templateData = {
        id: template.id,
        name: template.name,
        type: template.type,
        jurisdiction: template.jurisdiction,
        content: template.content,
      };

      // Increment user template usage count
      await supabase
        .from("templates")
        .update({
          usage_count: (template.usage_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    // Create new contract from template
    const contractTitle = customTitle || `${templateData.name} - ${new Date().toLocaleDateString()}`;

    // Replace placeholders with actual values
    let contractContent = templateData.content;
    if (contractContent.preamble && contractContent.clauses) {
      // Get all placeholders from the template content to build complete values map
      const fullContent = [
        contractContent.preamble || "",
        contractContent.recitals || "",
        contractContent.signatureBlock || "",
        ...(contractContent.clauses || []).map((c: { content?: string }) => c.content || ""),
      ].join("\n");

      const allTokens = extractPlaceholders(fullContent);

      // Build complete values object with defaults for missing placeholders
      const completeValues: Record<string, string> = {};

      // First, add all user-provided values
      if (placeholderValues) {
        for (const [key, value] of Object.entries(placeholderValues)) {
          if (value && value.trim()) {
            completeValues[key] = value;
          }
        }
      }

      // Then fill in defaults for any unfilled placeholders
      for (const token of allTokens) {
        const key = token.replace(/\{\{|\}\}/g, "");
        if (!completeValues[key]) {
          // Use sensible defaults based on placeholder type
          if (key.includes("date")) {
            completeValues[key] = "_____________";
          } else if (key.includes("amount") || key.includes("rate") || key.includes("period")) {
            completeValues[key] = "_____________";
          } else {
            completeValues[key] = "_____________";
          }
        }
      }

      contractContent = replaceAllPlaceholders(
        contractContent as Parameters<typeof replaceAllPlaceholders>[0],
        completeValues
      );
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        title: contractTitle,
        type: templateData.type,
        jurisdiction: templateData.jurisdiction,
        status: "draft",
        content: contractContent,
        user_id: user.id,
        metadata: {
          ...customMetadata,
          generatedBy: isSystemTemplate ? "system_template" : "template",
          templateId: templateData.id,
          templateName: templateData.name,
          placeholderValues: placeholderValues || {},
        },
      })
      .select()
      .single();

    if (contractError) {
      console.error("Error creating contract from template:", contractError);
      return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
    }

    // Auto-generate signature fields for each party (same as AI generation)
    const signerRoles = getSignerRoles(templateData.type);
    const signatureFields = signerRoles.flatMap((role, roleIndex) => [
      // Signature field for this role
      {
        contract_id: contract.id,
        type: "signature",
        label: "Signature",
        signer_role: role,
        required: true,
        position_x: roleIndex * 50,
        position_y: 10,
        width: 200,
        height: 60,
        order: roleIndex * 3 + 1,
      },
      // Date field for this role
      {
        contract_id: contract.id,
        type: "date",
        label: "Date",
        signer_role: role,
        required: true,
        position_x: roleIndex * 50 + 25,
        position_y: 10,
        width: 120,
        height: 30,
        order: roleIndex * 3 + 2,
      },
      // Printed Name field for this role
      {
        contract_id: contract.id,
        type: "text",
        label: "Printed Name",
        signer_role: role,
        required: true,
        position_x: roleIndex * 50,
        position_y: 50,
        width: 180,
        height: 30,
        order: roleIndex * 3 + 3,
      },
    ]);

    // Insert signature fields
    const { error: fieldsError } = await supabase
      .from("signature_fields")
      .insert(signatureFields);

    if (fieldsError) {
      console.error("Error creating signature fields:", fieldsError);
      // Don't fail the whole request, just log the error
    }

    return NextResponse.json({
      contract,
      message: "Contract created from template",
    }, { status: 201 });
  } catch (error) {
    console.error("Use template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
