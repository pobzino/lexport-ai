import type { ContractMetadata } from "./schemas";

export interface SignerInfo {
  role: string;
  name: string;
  email: string;
  title?: string;
  company?: string;
  isEntity?: boolean;
}

export function getAllSigners(contractType: string, metadata: ContractMetadata): SignerInfo[] {
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

  const mapping = roleMap[contractType] || { primary: "party1", secondary: "party2" };
  const labels = roleLabelMap[contractType] || { primary: "Party 1", secondary: "Party 2" };
  const entityConfig = entityRoles[contractType] || { primary: false, secondary: false };

  const primary = meta[mapping.primary] as { name?: string; email?: string; company?: string; title?: string } | undefined;
  const secondary = meta[mapping.secondary] as { name?: string; email?: string; company?: string; title?: string } | undefined;

  if (primary) {
    signers.push({
      role: labels.primary,
      name: primary.name || labels.primary,
      email: primary.email || "",
      company: primary.company,
      title: primary.title,
      isEntity: !!primary.company || entityConfig.primary,
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
    signers.push({
      role: labels.secondary,
      name: secondary.name || labels.secondary,
      email: secondary.email || "",
      company: secondary.company,
      title: secondary.title,
      isEntity: !!secondary.company || entityConfig.secondary,
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
