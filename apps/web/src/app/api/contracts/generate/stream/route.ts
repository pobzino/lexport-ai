import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContractStreaming } from "@/lib/contracts/generator-streaming";
import {
  ContractTypeEnum,
  NDAMetadataSchema,
  ContractorMetadataSchema,
  ConsultingMetadataSchema,
  SAFEMetadataSchema,
  FreelanceMetadataSchema,
  LOIMetadataSchema,
  CofounderMetadataSchema,
  SalesContractMetadataSchema,
  CustomMetadataSchema,
  PaymentConfigSchema,
  type ContractMetadata,
  type ContractType,
} from "@/lib/contracts/schemas";
import { z } from "zod";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";
import { checkContractLimit } from "@/lib/usage-tracking";
import { TIER_LIMITS } from "@/lib/rate-limits";

// Signer info for creating signature fields
interface SignerInfo {
  role: string;
  name: string;
  email: string;
  title?: string;
  company?: string;
  isEntity?: boolean;
}

// Helper to extract all signers from contract metadata
function getAllSigners(contractType: string, metadata: ContractMetadata): SignerInfo[] {
  const signers: SignerInfo[] = [];
  const meta = metadata as Record<string, unknown>;

  const signerGroups = meta.signerGroups as Array<{
    role: string;
    roleLabel: string;
    signers: Array<{ id: string; name: string; email: string; title?: string }>;
  }> | undefined;

  if (signerGroups && signerGroups.length > 0) {
    for (const group of signerGroups) {
      const isEntityRole = /company|corporation|corp|llc|ltd|inc/i.test(group.roleLabel);

      if (group.signers.length === 0) {
        signers.push({
          role: group.roleLabel,
          name: group.roleLabel,
          email: "",
          isEntity: isEntityRole,
        });
      } else {
        for (const signer of group.signers) {
          const hasTitle = !!(signer.title && signer.title.trim());
          signers.push({
            role: group.roleLabel,
            name: signer.name || group.roleLabel,
            email: signer.email || "",
            title: signer.title,
            isEntity: isEntityRole || hasTitle,
          });
        }
      }
    }
    return signers;
  }

  // Fallback to legacy 2-party extraction
  const roleMap: Record<string, { primary: string; secondary: string }> = {
    nda_mutual: { primary: "disclosingParty", secondary: "receivingParty" },
    nda_one_way: { primary: "disclosingParty", secondary: "receivingParty" },
    independent_contractor: { primary: "client", secondary: "contractor" },
    consulting_agreement: { primary: "client", secondary: "consultant" },
    safe_note: { primary: "company", secondary: "investor" },
    freelance_service: { primary: "client", secondary: "freelancer" },
    letter_of_intent: { primary: "proposingParty", secondary: "receivingParty" },
    cofounder_agreement: { primary: "party1", secondary: "party2" },
    sales_contract: { primary: "seller", secondary: "buyer" },
  };

  const roleLabelMap: Record<string, { primary: string; secondary: string }> = {
    nda_mutual: { primary: "Disclosing Party", secondary: "Receiving Party" },
    nda_one_way: { primary: "Disclosing Party", secondary: "Receiving Party" },
    independent_contractor: { primary: "Company", secondary: "Contractor" },
    consulting_agreement: { primary: "Client", secondary: "Consultant" },
    safe_note: { primary: "Company", secondary: "Investor" },
    freelance_service: { primary: "Client", secondary: "Freelancer" },
    letter_of_intent: { primary: "Proposing Party", secondary: "Receiving Party" },
    cofounder_agreement: { primary: "Co-Founder 1", secondary: "Co-Founder 2" },
    sales_contract: { primary: "Seller", secondary: "Buyer" },
  };

  const mapping = roleMap[contractType] || { primary: "party1", secondary: "party2" };
  const labels = roleLabelMap[contractType] || { primary: "Party 1", secondary: "Party 2" };

  const entityRoles: Record<string, { primary: boolean; secondary: boolean }> = {
    nda_mutual: { primary: true, secondary: true },
    nda_one_way: { primary: true, secondary: true },
    independent_contractor: { primary: true, secondary: false },
    consulting_agreement: { primary: true, secondary: false },
    safe_note: { primary: true, secondary: true },
    freelance_service: { primary: true, secondary: false },
    letter_of_intent: { primary: true, secondary: true },
    cofounder_agreement: { primary: false, secondary: false },
    sales_contract: { primary: true, secondary: true },
  };

  const entityConfig = entityRoles[contractType] || { primary: false, secondary: false };

  const primary = meta[mapping.primary] as { name?: string; email?: string; company?: string; title?: string } | undefined;
  const secondary = meta[mapping.secondary] as { name?: string; email?: string; company?: string; title?: string } | undefined;

  if (primary) {
    const hasCompany = !!primary.company;
    signers.push({
      role: labels.primary,
      name: primary.name || labels.primary,
      email: primary.email || "",
      company: primary.company,
      title: primary.title,
      isEntity: hasCompany || entityConfig.primary,
    });
  } else {
    signers.push({
      role: labels.primary,
      name: labels.primary,
      email: "",
      isEntity: entityConfig.primary,
    });
  }

  if (secondary) {
    const hasCompany = !!secondary.company;
    signers.push({
      role: labels.secondary,
      name: secondary.name || labels.secondary,
      email: secondary.email || "",
      company: secondary.company,
      title: secondary.title,
      isEntity: hasCompany || entityConfig.secondary,
    });
  } else {
    signers.push({
      role: labels.secondary,
      name: labels.secondary,
      email: "",
      isEntity: entityConfig.secondary,
    });
  }

  return signers;
}

// Request schema
const GenerateRequestSchema = z.object({
  contractType: ContractTypeEnum,
  metadata: z.union([
    NDAMetadataSchema,
    ContractorMetadataSchema,
    ConsultingMetadataSchema,
    SAFEMetadataSchema,
    FreelanceMetadataSchema,
    LOIMetadataSchema,
    CofounderMetadataSchema,
    SalesContractMetadataSchema,
    CustomMetadataSchema,
  ]),
  paymentConfig: PaymentConfigSchema.optional(),
});

// SSE helper to send events
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

export async function POST(request: NextRequest) {
  // Create a streaming response using ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null;

      try {
        // Start heartbeat to keep connection alive (every 5 seconds)
        heartbeatInterval = setInterval(() => {
          sendSSE(controller, "heartbeat", { timestamp: Date.now() });
        }, 5000);

        // Send initial progress
        sendSSE(controller, "progress", { status: "Authenticating...", percent: 5 });

        // Auth check
        const supabase = await createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          sendSSE(controller, "error", { message: "Unauthorized" });
          controller.close();
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        sendSSE(controller, "progress", { status: "Checking usage limits...", percent: 10 });

        // Check contract generation limits
        const limitCheck = await checkContractLimit(user.id);

        if (!limitCheck.allowed) {
          const tierLimits = TIER_LIMITS[limitCheck.tier];
          sendSSE(controller, "error", {
            message: limitCheck.tier === "free"
              ? `You've used your ${tierLimits.contractsPerMonth} free contract${tierLimits.contractsPerMonth > 1 ? "s" : ""} this month. Upgrade to Pro for 50 contracts/month.`
              : `You've reached your ${tierLimits.contractsPerMonth} contract limit for this month.`,
            upgradeUrl: "/settings/billing",
          });
          controller.close();
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        sendSSE(controller, "progress", { status: "Validating request...", percent: 15 });

        // Parse and validate request
        const body = await request.json();
        const parseResult = GenerateRequestSchema.safeParse(body);

        if (!parseResult.success) {
          sendSSE(controller, "error", { message: "Invalid request", details: parseResult.error.flatten() });
          controller.close();
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        const { contractType, metadata, paymentConfig } = parseResult.data;

        sendSSE(controller, "progress", { status: "Starting AI contract generation...", percent: 20 });

        // Generate contract with streaming
        const generated = await generateContractStreaming(
          contractType as ContractType,
          metadata as ContractMetadata,
          (progress) => {
            sendSSE(controller, "progress", progress);
          }
        );

        sendSSE(controller, "progress", { status: "Saving contract to database...", percent: 90 });

        // Build contract data with optional payment config
        const contractData: Record<string, unknown> = {
          user_id: user.id,
          title: generated.title,
          type: contractType,
          jurisdiction: metadata.jurisdiction,
          status: "draft",
          version: 1,
          content: {
            preamble: generated.preamble,
            recitals: generated.recitals,
            clauses: generated.clauses,
            signatureBlock: generated.signatureBlock,
          },
          metadata: metadata,
        };

        // Add payment configuration if provided
        if (paymentConfig) {
          contractData.payment_required = paymentConfig.paymentRequired;
          contractData.payment_amount = paymentConfig.paymentAmount || null;
          contractData.payment_currency = paymentConfig.paymentCurrency;
          contractData.payment_structure = paymentConfig.paymentStructure;
          contractData.deposit_percentage = paymentConfig.depositPercentage || null;
        }

        // Save to database
        const { data: savedContract, error: insertError } = await supabase
          .from("contracts")
          .insert(contractData)
          .select()
          .single();

        if (insertError) {
          console.error("Database insert error:", insertError);
          sendSSE(controller, "error", {
            message: "Failed to save contract",
            details: {
              reason: insertError.message,
              code: insertError.code,
              hint: insertError.hint,
              details: insertError.details,
            },
          });
          controller.close();
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        // Increment AI contracts used counter
        try {
          await supabase.rpc("increment_ai_contracts_used", { user_uuid: user.id });
        } catch (err) {
          console.error("Failed to increment contract usage:", err);
        }

        sendSSE(controller, "progress", { status: "Creating signature fields...", percent: 95 });

        // Auto-generate signature fields
        const allSigners = getAllSigners(contractType, metadata as ContractMetadata);
        const signatureFields = allSigners.flatMap((signer, signerIndex) => {
          const signersInSameRole = allSigners.filter(s => s.role === signer.role);
          const isMultiplePerRole = signersInSameRole.length > 1;
          const signerLabel = isMultiplePerRole ? `${signer.role} - ${signer.name || `Signer ${signerIndex + 1}`}` : signer.role;

          const baseFields = [
            {
              contract_id: savedContract.id,
              type: "signature",
              label: "Signature",
              signer_role: signerLabel,
              required: true,
              position_x: signerIndex * 50,
              position_y: 10,
              width: 200,
              height: 60,
              order: signerIndex * 5 + 1,
            },
            {
              contract_id: savedContract.id,
              type: "date",
              label: "Date",
              signer_role: signerLabel,
              required: true,
              position_x: signerIndex * 50 + 25,
              position_y: 10,
              width: 120,
              height: 30,
              order: signerIndex * 5 + 2,
            },
            {
              contract_id: savedContract.id,
              type: "text",
              label: "Printed Name",
              signer_role: signerLabel,
              required: true,
              position_x: signerIndex * 50,
              position_y: 50,
              width: 180,
              height: 30,
              order: signerIndex * 5 + 3,
              placeholder: signer.name || undefined,
            },
          ];

          if (signer.isEntity) {
            baseFields.push({
              contract_id: savedContract.id,
              type: "text",
              label: "Title",
              signer_role: signerLabel,
              required: true,
              position_x: signerIndex * 50,
              position_y: 80,
              width: 180,
              height: 30,
              order: signerIndex * 5 + 4,
              placeholder: signer.title || undefined,
            });
          }

          return baseFields;
        });

        // Insert signature fields
        const { error: fieldsError } = await supabase
          .from("signature_fields")
          .insert(signatureFields);

        if (fieldsError) {
          console.error("Error creating signature fields:", fieldsError);
        }

        // Create initial version snapshot
        const { error: versionError } = await supabase
          .from("contract_versions")
          .insert({
            contract_id: savedContract.id,
            version_number: 1,
            content: {
              preamble: generated.preamble,
              recitals: generated.recitals,
              clauses: generated.clauses,
              signatureBlock: generated.signatureBlock,
            },
            metadata: metadata,
            change_type: "create",
            change_summary: "Initial contract creation",
            created_by: user.id,
          });

        if (versionError) {
          console.error("Error creating initial version:", versionError);
        }

        // Log audit event
        const context = getRequestContextFromRequest(request);
        await auditLogger.contractCreated(
          savedContract.id,
          user.id,
          user.email || "",
          user.user_metadata?.name || user.user_metadata?.full_name || null,
          {
            contract_type: contractType,
            jurisdiction: metadata.jurisdiction,
            title: generated.title,
          },
          context
        );

        // Send completion event
        sendSSE(controller, "complete", {
          contractId: savedContract.id,
          title: generated.title,
        });

        // Clean up and close
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        controller.close();

      } catch (error) {
        console.error("Streaming contract generation error:", error);
        const genericMessage = error instanceof Error ? error.message : "Failed to generate contract";
        sendSSE(controller, "error", {
          message: "Failed to generate contract",
          details: { reason: genericMessage },
        });
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        controller.close();
      }
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
