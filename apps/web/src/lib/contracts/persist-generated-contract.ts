import type { SupabaseClient } from "@supabase/supabase-js";
import { logAuditEventWithClient, type RequestContext } from "../audit/logger";
import type { GeneratedContract } from "./generator";
import type {
  ContractMetadata,
  ContractType,
  PaymentConfig,
} from "./schemas";
import { getAllSigners } from "./signers";

interface PersistGeneratedContractParams {
  supabase: SupabaseClient;
  actor: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  contractType: ContractType;
  metadata: ContractMetadata;
  paymentConfig?: PaymentConfig;
  generated: GeneratedContract;
  context?: RequestContext;
}

export interface PersistGeneratedContractResult {
  contractId: string;
  title: string;
}

export async function persistGeneratedContract({
  supabase,
  actor,
  contractType,
  metadata,
  paymentConfig,
  generated,
  context,
}: PersistGeneratedContractParams): Promise<PersistGeneratedContractResult> {
  const content = {
    preamble: generated.preamble,
    recitals: generated.recitals,
    clauses: generated.clauses,
    signatureBlock: generated.signatureBlock,
  };

  const contractData: Record<string, unknown> = {
    user_id: actor.id,
    title: generated.title,
    type: contractType,
    jurisdiction: metadata.jurisdiction,
    status: "draft",
    version: 1,
    content,
    metadata,
  };

  if (paymentConfig) {
    contractData.payment_required = paymentConfig.paymentRequired;
    contractData.payment_amount = paymentConfig.paymentAmount || null;
    contractData.payment_currency = paymentConfig.paymentCurrency;
    contractData.payment_structure = paymentConfig.paymentStructure;
    contractData.deposit_percentage = paymentConfig.depositPercentage || null;
  }

  const { data: savedContract, error: insertError } = await supabase
    .from("contracts")
    .insert(contractData)
    .select("id")
    .single();

  if (insertError || !savedContract) {
    throw insertError ?? new Error("Failed to insert generated contract");
  }

  try {
    await supabase.rpc("increment_ai_contracts_used", { user_uuid: actor.id });
  } catch (error) {
    console.error("Failed to increment contract usage:", error);
  }

  const allSigners = getAllSigners(contractType, metadata);
  const signatureFields = allSigners.flatMap((signer, signerIndex) => {
    const signersInSameRole = allSigners.filter((candidate) => candidate.role === signer.role);
    const isMultiplePerRole = signersInSameRole.length > 1;
    const signerLabel = isMultiplePerRole
      ? `${signer.role} - ${signer.name || `Signer ${signerIndex + 1}`}`
      : signer.role;

    const baseFields: Record<string, unknown>[] = [
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

  if (signatureFields.length > 0) {
    const { error: fieldsError } = await supabase
      .from("signature_fields")
      .insert(signatureFields);

    if (fieldsError) {
      console.error("Error creating signature fields:", fieldsError);
    }
  }

  const { error: versionError } = await supabase
    .from("contract_versions")
    .insert({
      contract_id: savedContract.id,
      version_number: 1,
      content,
      metadata,
      change_type: "create",
      change_summary: "Initial contract creation",
      created_by: actor.id,
    });

  if (versionError) {
    console.error("Error creating initial version:", versionError);
  }

  await logAuditEventWithClient(supabase, {
    contractId: savedContract.id,
    eventType: "contract_created",
    userId: actor.id,
    actorEmail: actor.email || null,
    actorName: actor.name || null,
    metadata: {
      contract_type: contractType,
      jurisdiction: metadata.jurisdiction,
      title: generated.title,
    },
    context,
  });

  return {
    contractId: savedContract.id,
    title: generated.title,
  };
}
