import {
  CONTRACT_TYPES,
  type ContractType,
  type Jurisdiction,
  type SignerGroup,
} from "@/lib/contracts/schemas";

export type FormValidationErrors = Record<string, string>;

type BuildMetadataParams = {
  contractType: ContractType;
  jurisdiction: Jurisdiction;
  formData: Record<string, unknown>;
};

type ValidateFormDataParams = {
  selectedType: ContractType | null;
  formData: Record<string, unknown>;
  isCustomContract: boolean;
};

type MetadataBuilder = (
  base: Record<string, unknown>,
  formData: Record<string, unknown>
) => Record<string, unknown>;

const SIGNER_VALIDATED_TYPES = new Set<ContractType>([
  "nda_mutual",
  "nda_one_way",
  "consulting_agreement",
  "freelance_service",
  "independent_contractor",
  "safe_note",
  "letter_of_intent",
  "sales_contract",
]);

const REQUIRED_TEXT_FIELDS: Partial<
  Record<ContractType, Array<{ field: string; message: string }>>
> = {
  nda_mutual: [{ field: "purpose", message: "Purpose of disclosure is required" }],
  nda_one_way: [{ field: "purpose", message: "Purpose of disclosure is required" }],
  consulting_agreement: [{ field: "consultingScope", message: "Consulting scope is required" }],
  freelance_service: [
    { field: "projectName", message: "Project name is required" },
    { field: "projectDescription", message: "Project description is required" },
  ],
  independent_contractor: [{ field: "servicesDescription", message: "Description of services is required" }],
  letter_of_intent: [{ field: "transactionDescription", message: "Transaction description is required" }],
  sales_contract: [{ field: "productDescription", message: "Product description is required" }],
};

const REQUIRED_POSITIVE_NUMBER_FIELDS: Partial<
  Record<ContractType, Array<{ field: string; message: string }>>
> = {
  safe_note: [{ field: "investmentAmount", message: "Investment amount is required" }],
  sales_contract: [{ field: "totalAmount", message: "Total amount is required" }],
};

export const WIZARD_SUPPORTED_TYPES: ContractType[] = [
  "nda_mutual",
  "nda_one_way",
  "independent_contractor",
  "consulting_agreement",
  "safe_note",
  "freelance_service",
  "letter_of_intent",
  "cofounder_agreement",
  "sales_contract",
  "custom",
];

const WIZARD_SUPPORTED_TYPE_SET = new Set<ContractType>(WIZARD_SUPPORTED_TYPES);

export const isWizardSupportedType = (type: ContractType): boolean =>
  WIZARD_SUPPORTED_TYPE_SET.has(type);

export function resolveWizardTypeOrCustom(suggestedType: string): ContractType {
  const typed = suggestedType as ContractType;
  if (CONTRACT_TYPES[typed] && isWizardSupportedType(typed)) {
    return typed;
  }
  return "custom";
}

export function isCustomContractFlow(
  selectedType: ContractType | null,
  intakeConfidence?: number | null
): boolean {
  return selectedType === "custom" || (typeof intakeConfidence === "number" && intakeConfidence <= 50);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignerGroups(
  signerGroups: SignerGroup[] | undefined,
  errors: FormValidationErrors
): void {
  if (!signerGroups) return;

  signerGroups.forEach((group, groupIndex) => {
    group.signers.forEach((signer, signerIndex) => {
      if (!signer.name?.trim()) {
        errors[`signer_${groupIndex}_${signerIndex}_name`] = `${group.roleLabel} name is required`;
      }
      if (!signer.email?.trim()) {
        errors[`signer_${groupIndex}_${signerIndex}_email`] = `${group.roleLabel} email is required`;
      } else if (!isValidEmail(signer.email)) {
        errors[`signer_${groupIndex}_${signerIndex}_email`] = "Invalid email address";
      }
    });
  });
}

function validateNdaLegacyParties(
  formData: Record<string, unknown>,
  errors: FormValidationErrors
): void {
  const disclosingParty = formData.disclosingParty as Record<string, string> | undefined;
  const receivingParty = formData.receivingParty as Record<string, string> | undefined;

  if (!disclosingParty?.name?.trim()) errors.disclosingPartyName = "Disclosing party name is required";
  if (!disclosingParty?.email?.trim()) {
    errors.disclosingPartyEmail = "Disclosing party email is required";
  } else if (!isValidEmail(disclosingParty.email)) {
    errors.disclosingPartyEmail = "Invalid email address";
  }

  if (!receivingParty?.name?.trim()) errors.receivingPartyName = "Receiving party name is required";
  if (!receivingParty?.email?.trim()) {
    errors.receivingPartyEmail = "Receiving party email is required";
  } else if (!isValidEmail(receivingParty.email)) {
    errors.receivingPartyEmail = "Invalid email address";
  }
}

function validateRequiredFields(
  selectedType: ContractType,
  formData: Record<string, unknown>,
  errors: FormValidationErrors
): void {
  for (const rule of REQUIRED_TEXT_FIELDS[selectedType] || []) {
    const value = formData[rule.field];
    if (!value || (typeof value === "string" && !value.trim())) {
      errors[rule.field] = rule.message;
    }
  }

  for (const rule of REQUIRED_POSITIVE_NUMBER_FIELDS[selectedType] || []) {
    const value = formData[rule.field];
    if (typeof value !== "number" || value <= 0) {
      errors[rule.field] = rule.message;
    }
  }
}

function validateCofounders(
  formData: Record<string, unknown>,
  errors: FormValidationErrors
): void {
  if (!formData.companyName || !(formData.companyName as string).trim()) {
    errors.companyName = "Company name is required";
  }

  const cofounders = formData.cofounders as Array<{
    name?: string;
    email?: string;
    equityPercentage?: number;
  }> | undefined;

  if (!cofounders || cofounders.length < 2) {
    errors.cofounders = "At least 2 co-founders are required";
    return;
  }

  cofounders.forEach((cofounder, index) => {
    if (!cofounder.name?.trim()) {
      errors[`cofounder_${index}_name`] = `Co-founder ${index + 1} name is required`;
    }
    if (!cofounder.email?.trim()) {
      errors[`cofounder_${index}_email`] = `Co-founder ${index + 1} email is required`;
    } else if (!isValidEmail(cofounder.email)) {
      errors[`cofounder_${index}_email`] = "Invalid email address";
    }
    if (cofounder.equityPercentage === undefined || cofounder.equityPercentage < 0) {
      errors[`cofounder_${index}_equity`] = `Co-founder ${index + 1} equity percentage is required`;
    }
  });

  const totalEquity = cofounders.reduce((sum, c) => sum + (c.equityPercentage || 0), 0);
  if (totalEquity !== 100) {
    errors.totalEquity = `Equity percentages must sum to 100% (currently ${totalEquity}%)`;
  }
}

export function validateContractFormData({
  selectedType,
  formData,
  isCustomContract,
}: ValidateFormDataParams): FormValidationErrors {
  const errors: FormValidationErrors = {};
  const signerGroups = formData.signerGroups as SignerGroup[] | undefined;

  if (!selectedType) return errors;

  if (isCustomContract) {
    validateSignerGroups(signerGroups, errors);
    return errors;
  }

  if (selectedType === "cofounder_agreement") {
    validateCofounders(formData, errors);
    return errors;
  }

  if (SIGNER_VALIDATED_TYPES.has(selectedType)) {
    validateSignerGroups(signerGroups, errors);

    if (
      (selectedType === "nda_mutual" || selectedType === "nda_one_way") &&
      !signerGroups
    ) {
      validateNdaLegacyParties(formData, errors);
    }
  }

  validateRequiredFields(selectedType, formData, errors);

  return errors;
}

const buildNdaMetadata: MetadataBuilder = (base, formData) => ({
  ...base,
  disclosingParty: {
    name: (formData.disclosingParty as Record<string, string>)?.name || "_____[Disclosing Party Name]_____",
    email: (formData.disclosingParty as Record<string, string>)?.email || "",
    company: (formData.disclosingParty as Record<string, string>)?.company || "",
    role: "discloser",
  },
  receivingParty: {
    name: (formData.receivingParty as Record<string, string>)?.name || "_____[Receiving Party Name]_____",
    email: (formData.receivingParty as Record<string, string>)?.email || "",
    company: (formData.receivingParty as Record<string, string>)?.company || "",
    role: "recipient",
  },
  purpose: (formData.purpose as string) || "_____[Purpose of Agreement]_____",
  confidentialityPeriod: (formData.confidentialityPeriod as number) || 2,
  includeNonSolicit: (formData.includeNonSolicit as boolean) || false,
  includeNonCompete: (formData.includeNonCompete as boolean) || false,
  nonCompetePeriod: (formData.nonCompetePeriod as number) || 12,
});

const metadataBuilders: Partial<Record<ContractType, MetadataBuilder>> = {
  nda_mutual: buildNdaMetadata,
  nda_one_way: buildNdaMetadata,
  independent_contractor: (base, formData) => ({
    ...base,
    client: {
      name: (formData.client as Record<string, string>)?.name || "_____[Client Name]_____",
      email: (formData.client as Record<string, string>)?.email || "",
      role: "client",
    },
    contractor: {
      name: (formData.contractor as Record<string, string>)?.name || "_____[Contractor Name]_____",
      email: (formData.contractor as Record<string, string>)?.email || "",
      role: "contractor",
    },
    servicesDescription: (formData.servicesDescription as string) || "_____[Services Description]_____",
    paymentAmount: (formData.paymentAmount as number) || 0,
    paymentFrequency: (formData.paymentFrequency as string) || "monthly",
    paymentTerms: (formData.paymentTerms as number) || 30,
    terminationNoticeDays: 14,
    includeIPAssignment: true,
    includeConfidentiality: true,
  }),
  consulting_agreement: (base, formData) => ({
    ...base,
    client: {
      name: (formData.client as Record<string, string>)?.name || "_____[Client Name]_____",
      email: (formData.client as Record<string, string>)?.email || "",
      role: "client",
    },
    consultant: {
      name: (formData.consultant as Record<string, string>)?.name || "_____[Consultant Name]_____",
      email: (formData.consultant as Record<string, string>)?.email || "",
      role: "consultant",
    },
    consultingScope: (formData.consultingScope as string) || "_____[Consulting Scope]_____",
    hourlyRate: (formData.hourlyRate as number) || undefined,
    retainerAmount: (formData.retainerAmount as number) || undefined,
    paymentTerms: 30,
    includeIPAssignment: true,
    includeConfidentiality: true,
    includeNonCompete: false,
  }),
  safe_note: (base, formData) => ({
    ...base,
    company: {
      name: (formData.company as Record<string, string>)?.name || "_____[Company Name]_____",
      email: (formData.company as Record<string, string>)?.email || "",
      role: "company",
    },
    investor: {
      name: (formData.investor as Record<string, string>)?.name || "_____[Investor Name]_____",
      email: (formData.investor as Record<string, string>)?.email || "",
      role: "investor",
    },
    investmentAmount: (formData.investmentAmount as number) || 0,
    safeType: (formData.safeType as string) || "valuation_cap",
    valuationCap: (formData.valuationCap as number) || undefined,
    discountRate: (formData.discountRate as number) || undefined,
    proRataRights: (formData.proRataRights as boolean) || false,
  }),
  freelance_service: (base, formData) => ({
    ...base,
    client: {
      name: (formData.client as Record<string, string>)?.name || "_____[Client Name]_____",
      email: (formData.client as Record<string, string>)?.email || "",
      role: "client",
    },
    freelancer: {
      name: (formData.freelancer as Record<string, string>)?.name || "_____[Freelancer Name]_____",
      email: (formData.freelancer as Record<string, string>)?.email || "",
      role: "contractor",
    },
    projectName: (formData.projectName as string) || "_____[Project Name]_____",
    projectDescription: (formData.projectDescription as string) || "_____[Project Description]_____",
    totalAmount: (formData.totalAmount as number) || 0,
    depositAmount: (formData.depositAmount as number) || undefined,
    paymentSchedule: "milestone",
    revisionRounds:
      (formData.revisionRounds as number) === -1
        ? "unlimited"
        : ((formData.revisionRounds as number) || 2),
    deliverables: [
      {
        description: (formData.projectDescription as string) || "_____[Deliverable Description]_____",
      },
    ],
    includeIPAssignment: true,
  }),
  letter_of_intent: (base, formData) => ({
    ...base,
    proposingParty: {
      name: (formData.proposingParty as Record<string, string>)?.name || "_____[Proposing Party Name]_____",
      email: (formData.proposingParty as Record<string, string>)?.email || "",
      company: (formData.proposingParty as Record<string, string>)?.company || "",
      title: (formData.proposingParty as Record<string, string>)?.title || "",
      role: "proposing_party",
    },
    receivingParty: {
      name: (formData.receivingParty as Record<string, string>)?.name || "_____[Receiving Party Name]_____",
      email: (formData.receivingParty as Record<string, string>)?.email || "",
      company: (formData.receivingParty as Record<string, string>)?.company || "",
      title: (formData.receivingParty as Record<string, string>)?.title || "",
      role: "receiving_party",
    },
    transactionType: (formData.transactionType as string) || "acquisition",
    transactionDescription:
      (formData.transactionDescription as string) || "_____[Transaction Description]_____",
    proposedTerms: {
      purchasePrice: (formData.proposedPrice as number) || undefined,
      keyConditions: (formData.keyConditions as string[]) || [],
    },
    exclusivityPeriod: (formData.exclusivityPeriod as number) || 60,
    dueDiligencePeriod: (formData.dueDiligencePeriod as number) || 45,
    expirationDate: (formData.expirationDate as string) || undefined,
    isBindingTerms: (formData.bindingProvisions as string[]) || ["confidentiality"],
  }),
  cofounder_agreement: (base, formData) => {
    const cofoundersData = formData.cofounders as Array<{
      name?: string;
      email?: string;
      role?: string;
      equityPercentage?: number;
      vestingMonths?: number;
      cliffMonths?: number;
      responsibilities?: string;
      initialContribution?: { cash?: number; ipDescription?: string };
    }> | undefined;

    const cofounders = (cofoundersData || []).map((cf, index) => ({
      party: {
        name: cf.name || `Co-Founder ${index + 1}`,
        email: cf.email || "",
        role: "cofounder",
        title: cf.role || "",
      },
      equityPercentage: cf.equityPercentage || 0,
      vestingSchedule: {
        totalMonths: cf.vestingMonths || 48,
        cliffMonths: cf.cliffMonths || 12,
        accelerationOnChange: true,
      },
      role: cf.role || "",
      responsibilities: cf.responsibilities || "",
      initialContribution: cf.initialContribution || {},
    }));

    return {
      ...base,
      companyName: (formData.companyName as string) || "_____[Company Name]_____",
      companyType: (formData.companyType as string) || "corporation",
      cofounders,
      decisionMaking: {
        majorDecisionThreshold: (formData.majorDecisionThreshold as number) || 66,
        deadlockResolution: (formData.deadlockResolution as string) || "mediation",
      },
      salaryProvisions: {
        initialSalaries: (formData.initialSalaries as boolean) || false,
        salaryDetails: (formData.salaryDetails as string) || "",
      },
      ipAssignment: true,
      nonCompetePeriod: 24,
      exitProvisions: {
        rightOfFirstRefusal: (formData.rightOfFirstRefusal as boolean) ?? true,
        dragAlong: (formData.dragAlong as boolean) ?? true,
        tagAlong: (formData.tagAlong as boolean) ?? true,
      },
    };
  },
  sales_contract: (base, formData) => {
    const productsData = formData.products as Array<{
      name?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      specifications?: string;
    }> | undefined;

    const products = (productsData || []).map((product, index) => ({
      name: product.name || `Product ${index + 1}`,
      description: product.description || "",
      quantity: product.quantity || 1,
      unitPrice: product.unitPrice || 0,
      specifications: product.specifications || "",
    }));

    const totalAmount =
      (formData.totalAmount as number) ||
      products.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);

    return {
      ...base,
      seller: {
        name: (formData.seller as Record<string, string>)?.name || "_____[Seller Name]_____",
        email: (formData.seller as Record<string, string>)?.email || "",
        company: (formData.seller as Record<string, string>)?.company || "",
        address: (formData.seller as Record<string, string>)?.address || "",
        role: "seller",
      },
      buyer: {
        name: (formData.buyer as Record<string, string>)?.name || "_____[Buyer Name]_____",
        email: (formData.buyer as Record<string, string>)?.email || "",
        company: (formData.buyer as Record<string, string>)?.company || "",
        address: (formData.buyer as Record<string, string>)?.address || "",
        role: "buyer",
      },
      productDescription:
        (formData.productDescription as string) || "_____[Product Description]_____",
      products,
      totalAmount,
      currency: "usd",
      paymentTerms: {
        method: (formData.paymentMethod as string) || "full_upfront",
        depositPercentage: (formData.depositAmount as number)
          ? Math.round(((formData.depositAmount as number) / totalAmount) * 100)
          : undefined,
        installmentSchedule: (formData.installmentSchedule as string) || "",
      },
      deliveryTerms: {
        method: (formData.deliveryMethod as string) || "delivery",
        location: (formData.deliveryLocation as string) || "",
        estimatedDate: (formData.deliveryDate as string) || "",
        shippingTerms: "fob_destination",
        riskOfLoss: "on_delivery",
      },
      warranty: {
        included: (formData.includeWarranty as boolean) ?? true,
        periodMonths: (formData.warrantyPeriod as number) || 12,
        scope: "Standard manufacturer warranty",
      },
      returnPolicy: {
        allowed: false,
      },
    };
  },
};

export function buildContractMetadata({
  contractType,
  jurisdiction,
  formData,
}: BuildMetadataParams): Record<string, unknown> {
  const today = new Date().toISOString().split("T")[0];
  const signerGroups = formData.signerGroups as SignerGroup[] | undefined;

  const base: Record<string, unknown> = {
    contractType,
    jurisdiction,
    effectiveDate: (formData.effectiveDate as string) || today,
    signerGroups: signerGroups || undefined,
  };

  const builder = metadataBuilders[contractType];
  return builder ? builder(base, formData) : base;
}
