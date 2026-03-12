"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Edit,
  Sparkles,
  Loader2,
  Check,
  Clock,
  DollarSign,
  Info,
  RefreshCw,
  FileStack,
  Play,
  X,
  Eye,
  Star,
  FileCheck,
  UserCheck,
  ClipboardList,
  FileText,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ContractGeneratingOverlay } from "@/components/contract-generating-overlay";
import { ContractPreviewModal } from "@/components/contract-preview-modal";
import { EnhancedPlaceholderModal } from "@/components/contracts/EnhancedPlaceholderModal";
import { useOnboarding, type UserType } from "@/components/onboarding";

type CreationMode = "smart" | "manual" | "template";
type ManualCategory = "all" | "confidentiality" | "services" | "fundraising" | "company" | "commercial";

// Recommended contracts by user type
const RECOMMENDED_BY_USER_TYPE: Record<NonNullable<UserType>, ContractType[]> = {
  startup_founder: ["safe_note", "nda_mutual", "consulting_agreement"],
  freelancer: ["freelance_service", "nda_one_way", "nda_mutual"],
  agency: ["consulting_agreement", "independent_contractor", "nda_mutual"],
};

const MANUAL_TYPE_CATEGORIES: Array<{
  id: ManualCategory;
  label: string;
  typeIds: ContractType[];
}> = [
  {
    id: "all",
    label: "All",
    typeIds: [],
  },
  {
    id: "confidentiality",
    label: "Confidentiality",
    typeIds: ["nda_mutual", "nda_one_way"],
  },
  {
    id: "services",
    label: "Services",
    typeIds: ["independent_contractor", "consulting_agreement", "freelance_service"],
  },
  {
    id: "fundraising",
    label: "Fundraising",
    typeIds: ["safe_note", "letter_of_intent"],
  },
  {
    id: "company",
    label: "Company",
    typeIds: ["cofounder_agreement"],
  },
  {
    id: "commercial",
    label: "Commercial",
    typeIds: ["sales_contract"],
  },
];

const CONTRACT_DRAFT_STORAGE_KEY = "lexport:new-contract-draft:v1";
const RECENT_TYPES_STORAGE_KEY = "lexport:recent-contract-types:v1";
const JURISDICTION_STORAGE_KEY = "lexport:last-jurisdiction";

interface ContractDraftSnapshot {
  step: number;
  creationMode: CreationMode;
  selectedType: ContractType | null;
  jurisdiction: Jurisdiction;
  intakeDescription: string;
  followUpAnswers: Record<string, string>;
  formData: Record<string, unknown>;
  paymentRequired: boolean;
  paymentCurrency: string;
  paymentStructure: "full" | "deposit_balance" | "bnpl";
  showAdvancedOptions: boolean;
  templateSearch: string;
  templateJurisdiction: string;
  manualSearch: string;
  manualCategory: ManualCategory;
  savedAt: number;
}

// Placeholder type for system templates
interface Placeholder {
  id: string;
  token: string;
  label: string;
  description?: string;
  category: string;
  type: "text" | "email" | "date" | "number" | "textarea";
  required: boolean;
  autofillKey?: string;
}
import {
  CONTRACT_TYPES,
  JURISDICTION_NAMES,
  type ContractMetadata,
  type ContractType,
  type Jurisdiction,
  type PaymentConfig,
} from "@/lib/contracts/schemas";
import type { GenerateContractRequest } from "@/lib/contracts/generation-request";
import { ContactInput } from "@/components/contacts/ContactAutocomplete";
import { DynamicSignersSection, type SignerGroup, createSignerGroups } from "@/components/dynamic-signers";
import type { Template } from "@/db/types";
import {
  buildContractMetadata,
  isWizardSupportedType,
  isCustomContractFlow,
  resolveWizardTypeOrCustom,
  validateContractFormData,
} from "./flow-config";
import {
  parseRecentContractTypeHistory,
  pickRecentUniqueTypes,
  type RecentContractTypeEntry,
  upsertRecentContractType,
} from "./recent-types";

const SMART_STEPS = [
  { id: 1, name: "Describe", description: "Tell us what you need" },
  { id: 2, name: "Details", description: "Enter the specifics" },
  { id: 3, name: "Review", description: "Generate with AI" },
];

const MANUAL_STEPS = [
  { id: 1, name: "Type", description: "Choose contract type" },
  { id: 2, name: "Details", description: "Enter the specifics" },
  { id: 3, name: "Review", description: "Generate with AI" },
];

const TEMPLATE_STEPS = [
  { id: 1, name: "Template", description: "Choose a template" },
];

const SHOULD_USE_ASYNC_GENERATION = process.env.NODE_ENV === "production";
const ASYNC_GENERATION_POLL_INTERVAL_MS = 2500;

function getNetlifyDeploymentHeaders(): HeadersInit | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const deploymentId = document
    .querySelector('meta[name="x-deployment-id"]')
    ?.getAttribute("content")
    ?.trim();

  if (!deploymentId) {
    return undefined;
  }

  return {
    "x-deployment-id": deploymentId,
  };
}

// Intake analysis result type
interface IntakeAnalysis {
  suggestedType: string;
  confidence: number;
  contractTypeName: string;
  contractTypeDescription: string;
  contractTypeIcon: string;
  jurisdiction: string | null;
  jurisdictionName: string | null;
  availableJurisdictions: { id: string; name: string }[];
  extractedFields: Record<string, string | number | boolean>;
  followUpQuestions: {
    field: string;
    question: string;
    type: "text" | "select" | "number" | "date";
    options?: string[];
    required: boolean;
  }[];
  reasoning: string;
}

// Icon mapping
const CONTRACT_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  briefcase: Briefcase,
  users: Users,
  "trending-up": TrendingUp,
  edit: Edit,
  "file-check": FileCheck,
  "user-check": UserCheck,
  "clipboard-list": ClipboardList,
  "file-text": FileText,
  "shopping-cart": ShoppingCart,
};

function isValidCreationMode(value: string | null): value is CreationMode {
  return value === "smart" || value === "manual" || value === "template";
}

function isValidManualCategory(value: string | null): value is ManualCategory {
  return MANUAL_TYPE_CATEGORIES.some((category) => category.id === value);
}

function isValidContractType(value: string | null): value is ContractType {
  if (!value) return false;
  return Object.prototype.hasOwnProperty.call(CONTRACT_TYPES, value);
}

function isValidJurisdiction(value: string | null): value is Jurisdiction {
  if (!value) return false;
  return Object.prototype.hasOwnProperty.call(JURISDICTION_NAMES, value);
}

function formatSavedTimeAgo(savedAt: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - savedAt) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeStep, userType } = useOnboarding();
  const hasInitialized = useRef(false);
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming progress state
  const [generationProgress, setGenerationProgress] = useState<number | undefined>(undefined);
  const [generationStatus, setGenerationStatus] = useState<string | undefined>(undefined);
  const [generationLastEventAt, setGenerationLastEventAt] = useState<number | undefined>(undefined);

  // Preview modal state
  const [previewType, setPreviewType] = useState<ContractType | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Creation mode state - default to smart intake
  const [creationMode, setCreationMode] = useState<CreationMode>("smart");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateJurisdiction, setTemplateJurisdiction] = useState<string>("");
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualCategory, setManualCategory] = useState<ManualCategory>("all");
  const [recentTypeHistory, setRecentTypeHistory] = useState<RecentContractTypeEntry[]>([]);
  const [showAltCreationOptions, setShowAltCreationOptions] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Smart intake state
  const [intakeDescription, setIntakeDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intakeAnalysis, setIntakeAnalysis] = useState<IntakeAnalysis | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  // Matching template from smart intake (for cost-free generation)
  const [matchingTemplate, setMatchingTemplate] = useState<{
    id: string;
    title: string;
    contractType: string;
    jurisdiction: string;
    placeholders: string[];
    autoFilledValues: Record<string, string>;
    filledCount: number;
    totalCount: number;
  } | null>(null);

  // Placeholder modal state for system templates
  const [selectedTemplate, setSelectedTemplate] = useState<(Template & { content?: { placeholders?: Placeholder[] } }) | null>(null);
  const [showPlaceholderModal, setShowPlaceholderModal] = useState(false);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  // Form state
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us_california");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Payment settings state
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<"usd" | "eur" | "gbp">("usd");
  const [paymentStructure, setPaymentStructure] = useState<"full" | "deposit_balance" | "bnpl">("full");
  const [depositPercent, setDepositPercent] = useState(30);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Derive payment amount from form data (totalAmount or paymentAmount fields)
  const derivedPaymentAmount = (() => {
    const total = formData.totalAmount as number | undefined;
    const payment = formData.paymentAmount as number | undefined;
    const investment = formData.investmentAmount as number | undefined;
    return total || payment || investment || 0;
  })();

  // Derive deposit amount from form data or calculate from percentage
  const derivedDepositAmount = (() => {
    const deposit = formData.depositAmount as number | undefined;
    if (deposit) return deposit;
    return Math.round(derivedPaymentAmount * (depositPercent / 100));
  })();

  // Calculate deposit percentage from amounts
  const depositPercentage = derivedPaymentAmount > 0
    ? Math.round((derivedDepositAmount / derivedPaymentAmount) * 100)
    : 30;

  const wizardManualTypes = useMemo(
    () =>
      Object.values(CONTRACT_TYPES).filter(
        (type) => isWizardSupportedType(type.id) && type.id !== "custom"
      ),
    []
  );

  const recentContractTypes = useMemo(
    () =>
      pickRecentUniqueTypes(recentTypeHistory)
        .map((typeId) => CONTRACT_TYPES[typeId as ContractType])
        .filter(
          (type): type is (typeof CONTRACT_TYPES)[ContractType] =>
            Boolean(type) && isWizardSupportedType(type.id) && type.id !== "custom"
        ),
    [recentTypeHistory]
  );

  const recommendedTypeIds = useMemo(
    () =>
      new Set(
        userType
          ? (RECOMMENDED_BY_USER_TYPE[userType] || []).filter((typeId) =>
              isWizardSupportedType(typeId)
            )
          : []
      ),
    [userType]
  );

  const manualCategoryTypeIds = useMemo(() => {
    const category = MANUAL_TYPE_CATEGORIES.find((item) => item.id === manualCategory);
    return new Set(category?.typeIds || []);
  }, [manualCategory]);

  const manualFilteredTypes = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();
    return wizardManualTypes
      .filter((type) =>
        manualCategory === "all" ? true : manualCategoryTypeIds.has(type.id)
      )
      .filter((type) =>
        query
          ? type.name.toLowerCase().includes(query) ||
            type.description.toLowerCase().includes(query)
          : true
      )
      .filter((type) => !recommendedTypeIds.has(type.id));
  }, [
    manualSearch,
    manualCategory,
    manualCategoryTypeIds,
    wizardManualTypes,
    recommendedTypeIds,
  ]);

  const errorMessages = useMemo(
    () => Array.from(new Set(Object.values(formErrors))).slice(0, 5),
    [formErrors]
  );

  const flowSteps = useMemo(() => {
    if (creationMode === "manual") return MANUAL_STEPS;
    if (creationMode === "template") return TEMPLATE_STEPS;
    return SMART_STEPS;
  }, [creationMode]);

  const maxStep = flowSteps.length;

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const modeParam = searchParams.get("mode");
    const typeParam = searchParams.get("type");
    const jurisdictionParam = searchParams.get("jurisdiction");
    const categoryParam = searchParams.get("category");
    const promptParam = searchParams.get("prompt");
    const hasDeepLink = Boolean(modeParam || typeParam || jurisdictionParam || categoryParam || promptParam);

    try {
      const entries = parseRecentContractTypeHistory(
        localStorage.getItem(RECENT_TYPES_STORAGE_KEY),
        isValidContractType
      );
      setRecentTypeHistory(entries);
    } catch {
      // Ignore malformed local storage values.
    }

    // Restore last-used jurisdiction from localStorage as fallback
    try {
      const savedJurisdiction = localStorage.getItem(JURISDICTION_STORAGE_KEY);
      if (isValidJurisdiction(savedJurisdiction)) {
        setJurisdiction(savedJurisdiction);
      }
    } catch {
      // Ignore
    }

    if (!hasDeepLink) {
      try {
        const rawDraft = localStorage.getItem(CONTRACT_DRAFT_STORAGE_KEY);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft) as Partial<ContractDraftSnapshot>;
          if (typeof draft.step === "number") {
            setStep(Math.max(1, Math.min(3, draft.step)));
          }
          const draftMode = draft.creationMode ?? null;
          if (isValidCreationMode(draftMode)) {
            setCreationMode(draftMode);
          }
          const draftType = draft.selectedType ?? null;
          if (
            isValidContractType(draftType) &&
            (isWizardSupportedType(draftType) || draftType === "custom")
          ) {
            setSelectedType(draftType);
          } else if (draftType) {
            // Older drafts may contain types not supported in this wizard flow.
            // Reset to step 1 to avoid sending invalid generation payloads.
            setSelectedType(null);
            setStep(1);
          }
          const draftJurisdiction = draft.jurisdiction ?? null;
          if (isValidJurisdiction(draftJurisdiction)) {
            setJurisdiction(draftJurisdiction);
          }
          if (typeof draft.intakeDescription === "string") {
            setIntakeDescription(draft.intakeDescription);
          }
          if (draft.followUpAnswers && typeof draft.followUpAnswers === "object") {
            setFollowUpAnswers(draft.followUpAnswers);
          }
          if (draft.formData && typeof draft.formData === "object") {
            setFormData(draft.formData);
          }
          if (typeof draft.paymentRequired === "boolean") {
            setPaymentRequired(draft.paymentRequired);
          }
          if (typeof draft.paymentCurrency === "string") {
            if (
              draft.paymentCurrency === "usd" ||
              draft.paymentCurrency === "eur" ||
              draft.paymentCurrency === "gbp"
            ) {
              setPaymentCurrency(draft.paymentCurrency);
            }
          }
          if (
            draft.paymentStructure === "full" ||
            draft.paymentStructure === "deposit_balance" ||
            draft.paymentStructure === "bnpl"
          ) {
            setPaymentStructure(draft.paymentStructure);
          }
          if (typeof draft.showAdvancedOptions === "boolean") {
            setShowAdvancedOptions(draft.showAdvancedOptions);
          }
          if (typeof draft.templateSearch === "string") {
            setTemplateSearch(draft.templateSearch);
          }
          if (typeof draft.templateJurisdiction === "string") {
            setTemplateJurisdiction(draft.templateJurisdiction);
          }
          if (typeof draft.manualSearch === "string") {
            setManualSearch(draft.manualSearch);
          }
          const draftManualCategory = draft.manualCategory ?? null;
          if (isValidManualCategory(draftManualCategory)) {
            setManualCategory(draftManualCategory);
          }
          if (typeof draft.savedAt === "number") {
            setLastSavedAt(draft.savedAt);
          }
        }
      } catch {
        // Ignore malformed local storage values.
      }
    }

    if (isValidCreationMode(modeParam)) {
      setCreationMode(modeParam);
    }

    if (isValidManualCategory(categoryParam)) {
      setManualCategory(categoryParam);
    }

    if (isValidContractType(typeParam) && isWizardSupportedType(typeParam) && typeParam !== "custom") {
      setCreationMode("manual");
      setSelectedType(typeParam);
      setStep(2);
    }

    if (isValidJurisdiction(jurisdictionParam)) {
      setJurisdiction(jurisdictionParam);
    }

    // Pre-fill from prompt param (e.g., arriving from public /create flow after signup)
    if (promptParam) {
      setIntakeDescription(promptParam);
      setCreationMode("smart");
    }

    setIsHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isHydrated) return;

    const hasDraftContent =
      step > 1 ||
      Boolean(selectedType) ||
      Boolean(intakeDescription.trim()) ||
      Object.keys(followUpAnswers).length > 0 ||
      Object.keys(formData).length > 0 ||
      Boolean(templateSearch.trim()) ||
      Boolean(templateJurisdiction) ||
      Boolean(manualSearch.trim());

    if (!hasDraftContent) {
      localStorage.removeItem(CONTRACT_DRAFT_STORAGE_KEY);
      if (lastSavedAt !== null) {
        setLastSavedAt(null);
      }
      return;
    }

    const savedAt = Date.now();
    const draft: ContractDraftSnapshot = {
      step,
      creationMode,
      selectedType,
      jurisdiction,
      intakeDescription,
      followUpAnswers,
      formData,
      paymentRequired,
      paymentCurrency,
      paymentStructure,
      showAdvancedOptions,
      templateSearch,
      templateJurisdiction,
      manualSearch,
      manualCategory,
      savedAt,
    };

    const timeout = window.setTimeout(() => {
      localStorage.setItem(CONTRACT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    isHydrated,
    step,
    creationMode,
    selectedType,
    jurisdiction,
    intakeDescription,
    followUpAnswers,
    formData,
    paymentRequired,
    paymentCurrency,
    paymentStructure,
    showAdvancedOptions,
    templateSearch,
    templateJurisdiction,
    manualSearch,
    manualCategory,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(RECENT_TYPES_STORAGE_KEY, JSON.stringify(recentTypeHistory));
  }, [isHydrated, recentTypeHistory]);

  // Persist jurisdiction to localStorage so it's remembered across sessions
  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem(JURISDICTION_STORAGE_KEY, jurisdiction); } catch {}
  }, [isHydrated, jurisdiction]);

  useEffect(() => {
    if (step > maxStep) {
      setStep(maxStep);
    }
  }, [maxStep, step]);

  const handleTypeSelect = (
    type: ContractType,
    options?: { advanceToDetails?: boolean }
  ) => {
    setSelectedType(type);
    setFormData((previous) => (selectedType === type ? previous : {}));
    setFormErrors({});
    setError(null);
    if (options?.advanceToDetails) {
      setStep(2);
    }
  };

  const trackRecentType = (args: {
    type: string | ContractType | null | undefined;
    contractId: string | null | undefined;
  }) => {
    const { type, contractId } = args;
    if (!type || !isValidContractType(type)) return;
    if (!isWizardSupportedType(type) || type === "custom") return;
    if (!contractId || contractId.trim().length === 0) return;

    setRecentTypeHistory((previous) =>
      upsertRecentContractType(previous, {
        type,
        contractId,
      })
    );
  };

  const switchCreationMode = (mode: CreationMode) => {
    setCreationMode(mode);
    setStep(1);
    setError(null);
    setFormErrors({});
    setShowAltCreationOptions(false);

    if (mode !== "smart") {
      setIntakeAnalysis(null);
      setMatchingTemplate(null);
      setFollowUpAnswers({});
    }

    if (mode !== "manual") {
      setSelectedType(null);
    }

    router.push(`/contracts/new?mode=${mode}`);
  };

  const handleClearSavedDraft = () => {
    localStorage.removeItem(CONTRACT_DRAFT_STORAGE_KEY);
    setStep(1);
    setCreationMode("smart");
    setIntakeDescription("");
    setIntakeAnalysis(null);
    setMatchingTemplate(null);
    setFollowUpAnswers({});
    setSelectedType(null);
    setJurisdiction("us_california");
    setFormData({});
    setFormErrors({});
    setPaymentRequired(false);
    setPaymentCurrency("usd");
    setPaymentStructure("full");
    setShowAdvancedOptions(false);
    setTemplateSearch("");
    setTemplateJurisdiction("");
    setManualSearch("");
    setManualCategory("all");
    setShowAltCreationOptions(false);
    setError(null);
    setLastSavedAt(null);
  };

  // Smart intake analysis
  const handleAnalyzeIntake = async () => {
    if (!intakeDescription.trim() || intakeDescription.length < 10) {
      setError("Please describe what you need in more detail (at least 10 characters)");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/contracts/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: intakeDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze your request");
      }

      setIntakeAnalysis(data.analysis);

      // Track if we have a solid recommendation (confidence > 50%)
      const hasGoodMatch = data.hasRecommendation && data.analysis.confidence > 50;

      // Store matching template if found (for cost-free generation)
      if (data.matchingTemplate && hasGoodMatch) {
        setMatchingTemplate(data.matchingTemplate);
      } else {
        setMatchingTemplate(null);
      }

      // Only route into the structured wizard for types we fully support in this flow.
      // Everything else is treated as custom generation.
      setSelectedType(resolveWizardTypeOrCustom(data.analysis.suggestedType));
      if (data.analysis.jurisdiction) {
        setJurisdiction(data.analysis.jurisdiction as Jurisdiction);
      }

      // Pre-fill extracted fields into form data
      if (data.analysis.extractedFields) {
        setFormData(prev => ({ ...prev, ...data.analysis.extractedFields }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm intake analysis and proceed
  const handleConfirmIntake = () => {
    if (!intakeAnalysis || !selectedType) return;

    // Merge follow-up answers into form data
    const updatedFormData = { ...formData };
    for (const [field, value] of Object.entries(followUpAnswers)) {
      if (value) {
        updatedFormData[field] = value;
      }
    }
    setFormData(updatedFormData);

    // Proceed to details step
    setStep(2);
  };

  // Reset intake to try again
  const handleResetIntake = () => {
    setIntakeAnalysis(null);
    setMatchingTemplate(null);
    setFollowUpAnswers({});
    setSelectedType(null);
    setFormData({});
    setFormErrors({});
    setError(null);
  };

  // Validate form data based on contract type
  const validateFormData = (): boolean => {
    const isCustomContract = isCustomContractFlow(selectedType, intakeAnalysis?.confidence);
    const errors = validateContractFormData({
      selectedType,
      formData,
      isCustomContract,
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (creationMode === "smart") {
        if (!intakeAnalysis) {
          void handleAnalyzeIntake();
          return;
        }
        handleConfirmIntake();
        return;
      }
    }

    // Validate before moving from step 2 to step 3
    if (step === 2) {
      const isValid = validateFormData();
      if (!isValid) {
        setError("Please fill in all required fields");
        return;
      }
      setError(null);
    }
    if (step < maxStep) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = async () => {
    if (!selectedType) return;
    if (!isWizardSupportedType(selectedType)) {
      setError("This contract type is not supported in this creation flow. Please choose a type again.");
      setStep(1);
      setSelectedType(null);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStatus("Starting...");
    setGenerationLastEventAt(Date.now());

    try {
      // Check if this should run through custom generation
      const isCustomContract = isCustomContractFlow(selectedType, intakeAnalysis?.confidence);

      // Build the metadata based on contract type
      let metadata = buildContractMetadata({
        contractType: selectedType,
        jurisdiction,
        formData,
      });

      // For custom contracts, add the custom contract name and intake data
      if (isCustomContract) {
        metadata = {
          ...metadata,
          customContractName: intakeAnalysis?.contractTypeName || "Custom Contract",
          customContractDescription: intakeDescription || "Custom contract requirements",
          // Include follow-up answers as nested object for AI prompt
          followUpAnswers: Object.keys(followUpAnswers).length > 0 ? followUpAnswers : undefined,
          // Also spread for backwards compatibility
          ...followUpAnswers,
        };
      }

      // Build payment config if payment is required
      const paymentConfig = paymentRequired
        ? {
            paymentRequired: true,
            paymentAmount: derivedPaymentAmount || undefined,
            paymentCurrency,
            paymentStructure,
            depositPercentage: paymentStructure === "deposit_balance" ? depositPercentage : undefined,
            depositAmount: paymentStructure === "deposit_balance" ? derivedDepositAmount : undefined,
          }
        : undefined;

      const generationPayload = {
        contractType: isCustomContract ? "custom" : selectedType,
        metadata: metadata as ContractMetadata,
        paymentConfig: paymentConfig as PaymentConfig | undefined,
      } as GenerateContractRequest;

      if (SHOULD_USE_ASYNC_GENERATION) {
        const deploymentHeaders = getNetlifyDeploymentHeaders();
        const response = await fetch("/api/contracts/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...deploymentHeaders,
          },
          body: JSON.stringify(generationPayload),
        });

        const payload = await response.json().catch(() => null) as {
          error?: unknown;
          message?: unknown;
          jobId?: unknown;
          progressPercent?: unknown;
          progressStatus?: unknown;
        } | null;

        if (!response.ok || !payload || typeof payload.jobId !== "string") {
          const message =
            typeof payload?.error === "string"
              ? payload.error
              : typeof payload?.message === "string"
                ? payload.message
                : "Failed to start contract generation";
          throw new Error(message);
        }

        setGenerationProgress(
          typeof payload.progressPercent === "number" ? payload.progressPercent : 5
        );
        setGenerationStatus(
          typeof payload.progressStatus === "string"
            ? payload.progressStatus
            : "Queued for generation"
        );
        setGenerationLastEventAt(Date.now());

        while (true) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, ASYNC_GENERATION_POLL_INTERVAL_MS)
          );

          const statusResponse = await fetch(`/api/contracts/generate/${payload.jobId}`, {
            cache: "no-store",
            headers: deploymentHeaders,
          });
          const statusPayload = await statusResponse.json().catch(() => null) as {
            error?: unknown;
            status?: unknown;
            progressPercent?: unknown;
            progressStatus?: unknown;
            contractId?: unknown;
          } | null;

          if (!statusResponse.ok || !statusPayload) {
            throw new Error(
              typeof statusPayload?.error === "string"
                ? statusPayload.error
                : "Failed to check contract generation status"
            );
          }

          setGenerationProgress(
            typeof statusPayload.progressPercent === "number"
              ? statusPayload.progressPercent
              : undefined
          );
          setGenerationStatus(
            typeof statusPayload.progressStatus === "string"
              ? statusPayload.progressStatus
              : undefined
          );
          setGenerationLastEventAt(Date.now());

          if (
            statusPayload.status === "completed" &&
            typeof statusPayload.contractId === "string"
          ) {
            completeStep("first_contract");
            trackRecentType({
              type: selectedType,
              contractId: statusPayload.contractId,
            });
            router.push(`/contracts/${statusPayload.contractId}/edit`);
            return;
          }

          if (statusPayload.status === "failed" || statusPayload.status === "timed_out") {
            throw new Error(
              typeof statusPayload.error === "string"
                ? statusPayload.error
                : statusPayload.status === "timed_out"
                  ? "Contract generation timed out. Please retry."
                  : "Contract generation failed"
            );
          }
        }
      }

      const response = await fetch("/api/contracts/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generationPayload),
      });

      if (!response.ok) {
        let message = "Failed to start contract generation";
        try {
          const payload = await response.json();
          if (payload && typeof payload === "object") {
            const data = payload as { error?: unknown; message?: unknown };
            if (typeof data.error === "string") message = data.error;
            else if (typeof data.message === "string") message = data.message;
          }
        } catch {
          // Ignore non-JSON payloads and fall back to default message.
        }
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read response stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const message of lines) {
          if (!message.trim()) continue;

          const eventMatch = message.match(/event: (\w+)/);
          const dataMatch = message.match(/data: (.+)/);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            switch (eventType) {
              case "progress":
                setGenerationProgress(data.percent);
                setGenerationStatus(data.status);
                setGenerationLastEventAt(Date.now());
                break;
              case "complete":
                completeStep("first_contract");
                trackRecentType({
                  type: selectedType,
                  contractId: typeof data.contractId === "string" ? data.contractId : null,
                });
                router.push(`/contracts/${data.contractId}/edit`);
                return;
              case "error":
                if (data.details?.fieldErrors && typeof data.details.fieldErrors === "object") {
                  const firstField = Object.values(data.details.fieldErrors).find(
                    (messages): messages is string[] =>
                      Array.isArray(messages) && messages.length > 0
                  );
                  const firstMessage = firstField?.[0];
                  throw new Error(
                    firstMessage
                      ? `${data.message || "Generation failed"}: ${firstMessage}`
                      : data.message || "Generation failed"
                  );
                }
                if (data.message === "Failed to save contract") {
                  const reason =
                    typeof data.details?.reason === "string" ? data.details.reason : null;
                  const details =
                    typeof data.details?.details === "string" ? data.details.details : null;
                  const hint = typeof data.details?.hint === "string" ? data.details.hint : null;
                  const code = typeof data.details?.code === "string" ? data.details.code : null;

                  const parts = ["Couldn't save the generated contract to the database."];
                  if (reason) parts.push(reason);
                  else if (details) parts.push(details);
                  if (hint) parts.push(hint);
                  if (code) parts.push(`Error code: ${code}.`);
                  parts.push("Please retry. If it keeps happening, refresh and try again.");
                  throw new Error(parts.join(" "));
                }
                throw new Error(data.message || "Generation failed");
              case "heartbeat":
                setGenerationLastEventAt(Date.now());
                break;
            }
          }
        }
      }

      throw new Error("Connection closed before completion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(undefined);
      setGenerationStatus(undefined);
      setGenerationLastEventAt(undefined);
    }
  };

  // Fetch templates when template mode is active
  useEffect(() => {
    if (creationMode !== "template") return;

    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const params = new URLSearchParams();
        if (templateSearch) params.set("search", templateSearch);
        if (templateJurisdiction) params.set("jurisdiction", templateJurisdiction);
        params.set("public", "all");

        const response = await fetch(`/api/templates?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    const debounce = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(debounce);
  }, [creationMode, templateSearch, templateJurisdiction]);

  // Handle clicking on a template - show modal for system templates
  const handleUseTemplate = (template: Template) => {
    const isSystem = 'is_system' in template && (template as { is_system?: boolean }).is_system === true;
    const templateWithContent = template as Template & { content?: { placeholders?: Placeholder[] } };

    // For system templates with placeholders, show the fill-in modal
    if (isSystem && templateWithContent.content?.placeholders?.length) {
      setSelectedTemplate(templateWithContent);
      setPlaceholderValues({});
      setShowPlaceholderModal(true);
    } else {
      // For user templates or templates without placeholders, create directly
      createContractFromTemplate(template.id, undefined, template.type);
    }
  };

  // Actually create the contract from template (with optional placeholder values)
  const createContractFromTemplate = async (
    templateId: string,
    values?: Record<string, string>,
    templateType?: string
  ) => {
    setIsUsingTemplate(true);
    setError(null);

    try {
      // Map values from placeholder IDs to placeholder tokens (what the API expects)
      let mappedValues: Record<string, string> = {};
      if (values && selectedTemplate?.content?.placeholders) {
        const placeholders = selectedTemplate.content.placeholders;
        for (const [id, value] of Object.entries(values)) {
          const placeholder = placeholders.find(p => p.id === id);
          if (placeholder && value) {
            // Strip {{}} from token to get the key the API expects
            const tokenKey = placeholder.token.replace(/\{\{|\}\}/g, "");
            mappedValues[tokenKey] = value;
          }
        }
      } else {
        mappedValues = values || {};
      }

      const response = await fetch(`/api/templates/${templateId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeholderValues: mappedValues,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create contract from template");
      }

      const data = await response.json();
      setShowPlaceholderModal(false);
      // Mark onboarding step complete
      completeStep("first_contract");
      trackRecentType({
        type: templateType,
        contractId:
          data?.contract?.id && typeof data.contract.id === "string"
            ? data.contract.id
            : null,
      });
      router.push(`/contracts/${data.contract.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsUsingTemplate(false);
    }
  };

  // Handle submitting the placeholder form
  const handlePlaceholderSubmit = () => {
    if (!selectedTemplate) return;
    createContractFromTemplate(selectedTemplate.id, placeholderValues, selectedTemplate.type);
  };

  // Handle using the matching template from smart intake (instant, $0 cost)
  const handleUseMatchingTemplate = async () => {
    if (!matchingTemplate) return;

    setIsUsingTemplate(true);
    setError(null);

    try {
      // Use auto-filled values from the intake analysis
      const response = await fetch(`/api/templates/${matchingTemplate.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeholderValues: matchingTemplate.autoFilledValues,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create contract from template");
      }

      const data = await response.json();
      // Mark onboarding step complete
      completeStep("first_contract");
      trackRecentType({
        type: matchingTemplate.contractType,
        contractId:
          data?.contract?.id && typeof data.contract.id === "string"
            ? data.contract.id
            : null,
      });
      router.push(`/contracts/${data.contract.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsUsingTemplate(false);
    }
  };

  const stepOneContinueDisabled =
    step === 1 &&
    (creationMode === "manual"
      ? !selectedType
      : creationMode === "smart"
        ? intakeAnalysis
          ? !selectedType
          : isAnalyzing || intakeDescription.length < 10
        : true);

  const stepOneContinueLabel =
    step === 1 && creationMode === "smart" && !intakeAnalysis
      ? "Analyze & Continue"
      : "Continue";

  const isCustomGenerationFlow = isCustomContractFlow(selectedType, intakeAnalysis?.confidence);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step 1: Smart Intake / Choose Contract Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="max-w-3xl mx-auto mb-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </Link>
              <h2 className="text-2xl font-bold text-slate-900">
                {creationMode === "smart"
                  ? "Create a contract"
                  : creationMode === "manual"
                    ? "Pick a contract type"
                    : "Use a template"}
              </h2>
              <p className="text-slate-600 mt-1">
                {creationMode === "smart"
                  ? "Describe your situation in plain English and let AI choose the right contract."
                  : creationMode === "manual"
                    ? "Choose a contract type to start."
                    : "Start from an existing template."}
              </p>
              {lastSavedAt && (
                <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                  <span>Auto-saved {formatSavedTimeAgo(lastSavedAt)}</span>
                  <button
                    type="button"
                    onClick={handleClearSavedDraft}
                    className="font-medium text-slate-700 hover:text-slate-900"
                  >
                    Reset draft
                  </button>
                </div>
              )}
            </div>

            {creationMode === "smart" ? (
              <div className="max-w-3xl mx-auto space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAltCreationOptions((previous) => !previous)}
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Need another starting point?
                  {showAltCreationOptions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showAltCreationOptions && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    <button
                      type="button"
                      onClick={() => switchCreationMode("manual")}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      Pick contract type
                    </button>
                    <button
                      type="button"
                      onClick={() => switchCreationMode("template")}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileStack className="h-3.5 w-3.5" />
                      Use template
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <button
                  type="button"
                  onClick={() => switchCreationMode("smart")}
                  className="text-sm text-[#529ec6] hover:text-[#3d7a9e] font-medium"
                >
                  ← Back to AI describe flow
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && step === 1 && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
                  <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Smart Intake Mode */}
            {creationMode === "smart" && !intakeAnalysis && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Describe what you need
                  </label>
                  <textarea
                    value={intakeDescription}
                    onChange={(e) => setIntakeDescription(e.target.value)}
                    placeholder="Example: I'm hiring a freelance designer in California for a 3-month project to redesign our company website. The total budget is $15,000 with a 30% deposit upfront..."
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] resize-none text-slate-900 placeholder:text-slate-400"
                    disabled={isAnalyzing}
                  />

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-xs text-slate-500">
                      {intakeDescription.trim().length} characters (minimum 10)
                    </p>
                    <button
                      type="button"
                      onClick={handleAnalyzeIntake}
                      disabled={isAnalyzing || intakeDescription.length < 10}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#202e46] to-[#2a3d5c] text-white hover:from-[#1a2539] hover:to-[#202e46] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyze & Continue
                        </>
                      )}
                    </button>
                  </div>

                  <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                      Need an example prompt?
                    </summary>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {[
                        "NDA with investor",
                        "Freelance web redesign project",
                        "Consulting at $200/hour",
                      ].map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => setIntakeDescription(example)}
                          className="text-xs px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-full border border-slate-200 transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            )}

            {/* Smart Intake Analysis Result */}
            {creationMode === "smart" && intakeAnalysis && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Suggested Contract Type */}
                <div className="bg-white rounded-xl border-2 border-[#529ec6]/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        intakeAnalysis.confidence > 50 ? "bg-[#529ec6]/10" : "bg-amber-50"
                      }`}>
                        {(() => {
                          const Icon = CONTRACT_ICONS[intakeAnalysis.contractTypeIcon] || FileText;
                          return <Icon className={`w-6 h-6 ${intakeAnalysis.confidence > 50 ? "text-[#529ec6]" : "text-amber-600"}`} />;
                        })()}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${intakeAnalysis.confidence > 50 ? "text-[#529ec6]" : "text-amber-600"}`}>
                          {intakeAnalysis.confidence > 50 ? "Recommended Contract" : "Custom Contract"}
                        </p>
                        <h3 className="text-xl font-bold text-slate-900">
                          {intakeAnalysis.contractTypeName}
                        </h3>
                      </div>
                    </div>
                    {intakeAnalysis.confidence > 50 && (
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          intakeAnalysis.confidence >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : intakeAnalysis.confidence >= 60
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          {intakeAnalysis.confidence}% match
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-600 mb-4">
                    {intakeAnalysis.confidence > 50
                      ? intakeAnalysis.contractTypeDescription
                      : "Our AI will generate this contract tailored to your specific needs."}
                  </p>

                  {/* Jurisdiction */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <span className="font-medium">Jurisdiction:</span>
                    <select
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                      className="px-2 py-1 border border-slate-200 rounded text-slate-700 bg-white"
                    >
                      {intakeAnalysis.availableJurisdictions.map((j) => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Template Match Suggestion - Instant $0 Generation */}
                  {matchingTemplate && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 p-5 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-emerald-800">Template Match Found!</h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              Instant
                            </span>
                          </div>
                          <p className="text-sm text-emerald-700 mb-3">
                            We have a pre-built template that matches your needs. Use it for instant generation with no AI cost.
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={handleUseMatchingTemplate}
                              disabled={isUsingTemplate}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isUsingTemplate ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Use Template (Instant)
                                </>
                              )}
                            </button>
                            <span className="text-xs text-emerald-600">
                              or continue below for AI-generated version
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extracted Details */}
                  {Object.keys(intakeAnalysis.extractedFields).length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">Details I found:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(intakeAnalysis.extractedFields).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-slate-500">{formatFieldLabel(key)}:</span>
                            <span className="text-slate-900 font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {intakeAnalysis.followUpQuestions.length > 0 && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3">A few quick questions:</p>
                      <div className="space-y-3">
                        {intakeAnalysis.followUpQuestions.map((q) => (
                          <div key={q.field}>
                            <label className="block text-sm text-slate-600 mb-1">
                              {q.question}
                              {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {q.type === "select" && q.options ? (
                              <select
                                value={followUpAnswers[q.field] || ""}
                                onChange={(e) => setFollowUpAnswers(prev => ({ ...prev, [q.field]: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] bg-white"
                              >
                                <option value="">Select...</option>
                                {q.options.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
                                value={followUpAnswers[q.field] || ""}
                                onChange={(e) => setFollowUpAnswers(prev => ({ ...prev, [q.field]: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6]"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={handleResetIntake}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      ← Start over
                    </button>
                    <button
                      onClick={() => switchCreationMode("manual")}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      Pick different type
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Mode - Contract Type Selection */}
            {creationMode === "manual" && (
              <div className="space-y-8">
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="grid md:grid-cols-[1fr_auto] gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search contract types..."
                        value={manualSearch}
                        onChange={(event) => setManualSearch(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6]"
                      />
                      <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 106.04 6.04a7.5 7.5 0 0010.61 10.61z"
                        />
                      </svg>
                    </div>
                    {(manualSearch || manualCategory !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualSearch("");
                          setManualCategory("all");
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MANUAL_TYPE_CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setManualCategory(category.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          manualCategory === category.id
                            ? "border-[#529ec6]/30 bg-[#529ec6]/10 text-[#202e46]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    {manualFilteredTypes.length} matching type
                    {manualFilteredTypes.length === 1 ? "" : "s"}
                  </p>
                </div>

                {/* Recent Section */}
                {recentContractTypes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-slate-500" />
                      <h3 className="text-lg font-semibold text-slate-900">Recently used</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {recentContractTypes.map((type) => (
                        <ContractTypeSelectionCard
                          key={type.id}
                          type={type}
                          isSelected={selectedType === type.id}
                          onSelect={() => handleTypeSelect(type.id, { advanceToDetails: true })}
                          onPreview={() => {
                            setPreviewType(type.id);
                            setShowPreview(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended for You Section */}
                {userType && recommendedTypeIds.size > 0 && !manualSearch && manualCategory === "all" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-amber-500" />
                      <h3 className="text-lg font-semibold text-slate-900">Recommended for You</h3>
                      <span className="text-sm text-slate-500">
                        ({userType === "startup_founder" ? "Startup Founder" : userType === "freelancer" ? "Freelancer" : "Agency"})
                      </span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {Array.from(recommendedTypeIds).map((typeId) => {
                        const type = CONTRACT_TYPES[typeId];
                        if (!type) return null;
                        return (
                          <ContractTypeSelectionCard
                            key={type.id}
                            type={type}
                            isSelected={selectedType === type.id}
                            onSelect={() => handleTypeSelect(type.id, { advanceToDetails: true })}
                            onPreview={() => {
                              setPreviewType(type.id);
                              setShowPreview(true);
                            }}
                            accent="recommended"
                            badgeLabel="Top Pick"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filtered Contract Types */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {manualSearch || manualCategory !== "all"
                      ? "Matching Contract Types"
                      : userType
                        ? "All Contract Types"
                        : "Choose a Contract Type"}
                  </h3>
                  {manualFilteredTypes.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                      <p className="font-medium text-slate-900">No contract types match those filters</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try clearing filters or switching to Describe Need mode.
                      </p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {manualFilteredTypes.map((type) => (
                        <ContractTypeSelectionCard
                          key={type.id}
                          type={type}
                          isSelected={selectedType === type.id}
                          onSelect={() => handleTypeSelect(type.id, { advanceToDetails: true })}
                          onPreview={() => {
                            setPreviewType(type.id);
                            setShowPreview(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Template Mode - Template Browser */}
            {creationMode === "template" && (
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6]"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <select
                    value={templateJurisdiction}
                    onChange={(e) => setTemplateJurisdiction(e.target.value)}
                    className="px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] bg-white text-slate-700 min-w-[160px]"
                  >
                    <option value="">All Jurisdictions</option>
                    <option value="us_california">California</option>
                    <option value="us_texas">Texas</option>
                    <option value="us_new_york">New York</option>
                    <option value="uk">United Kingdom</option>
                  </select>
                </div>

                {/* Loading State */}
                {templatesLoading && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                          <div className="space-y-2">
                            <div className="h-4 w-20 bg-slate-200 rounded" />
                            <div className="h-3 w-16 bg-slate-100 rounded" />
                          </div>
                        </div>
                        <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                        <div className="h-4 w-full bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!templatesLoading && templates.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileStack className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {templateSearch || templateJurisdiction ? "No templates found" : "No templates yet"}
                    </h3>
                    <p className="text-slate-500 mb-4 max-w-md mx-auto">
                      {templateSearch || templateJurisdiction
                        ? "Try adjusting your search or filter, or create a new contract with AI."
                        : "Create contracts and save them as templates to reuse later."}
                    </p>
                    {(templateSearch || templateJurisdiction) && (
                      <button
                        onClick={() => { setTemplateSearch(""); setTemplateJurisdiction(""); }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors mr-2"
                      >
                        Clear filters
                      </button>
                    )}
                    <button
                      onClick={() => switchCreationMode("smart")}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#529ec6] bg-[#529ec6]/5 rounded-lg hover:bg-[#529ec6]/10 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate with AI instead
                    </button>
                  </div>
                )}

                {/* Template Cards */}
                {!templatesLoading && templates.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => {
                      const Icon = CONTRACT_ICONS[template.type as keyof typeof CONTRACT_ICONS] || Shield;
                      const typeName = CONTRACT_TYPES[template.type as ContractType]?.name || template.type;
                      const jurisdictionName = JURISDICTION_NAMES[template.jurisdiction as Jurisdiction] || template.jurisdiction;
                      const isSystem = 'is_system' in template && (template as { is_system?: boolean }).is_system === true;

                      return (
                        <div
                          key={template.id}
                          className={`group bg-white border rounded-xl p-4 hover:shadow-md transition-all ${
                            isSystem
                              ? "border-emerald-200 hover:border-emerald-300"
                              : "border-slate-200 hover:border-[#529ec6]/30"
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSystem ? "bg-emerald-100" : "bg-[#529ec6]/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isSystem ? "text-emerald-600" : "text-[#529ec6]"
                              }`} />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {isSystem && (
                                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  Pre-built
                                </span>
                              )}
                              <span className="text-xs font-medium text-[#529ec6] bg-[#529ec6]/5 px-2 py-0.5 rounded">
                                {typeName}
                              </span>
                              <span className="text-xs text-slate-500">{jurisdictionName}</span>
                            </div>
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <span className="text-xs text-slate-400">
                              {isSystem ? "Ready to use" : `${template.usage_count || 0} uses`}
                            </span>
                            <button
                              onClick={() => handleUseTemplate(template)}
                              disabled={isUsingTemplate}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                isSystem
                                  ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                  : "text-[#529ec6] bg-[#529ec6]/5 hover:bg-[#529ec6]/10"
                              }`}
                            >
                              {isUsingTemplate ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Link to full template library */}
                {!templatesLoading && templates.length > 0 && (
                  <div className="text-center pt-4">
                    <Link
                      href="/my-templates"
                      className="text-sm text-[#529ec6] hover:text-[#202e46] font-medium"
                    >
                      Browse all templates →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Jurisdiction Selection - Only in Manual Mode */}
            {creationMode === "manual" && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 mt-8">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Jurisdiction
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Select the jurisdiction where this contract will be enforced.
                  This affects the legal language and clauses.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(
                    Object.entries(JURISDICTION_NAMES) as [Jurisdiction, string][]
                  ).map(([key, name]) => {
                    // Filter out UK for SAFE notes
                    if (selectedType === "safe_note" && key === "uk") return null;

                    return (
                      <button
                        key={key}
                        onClick={() => setJurisdiction(key)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                          jurisdiction === key
                            ? "border-[#529ec6] bg-[#529ec6]/5 text-[#202e46]"
                            : "border-slate-200 text-slate-600 hover:border-[#529ec6]/30"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 2 && selectedType && (
          <div className="space-y-6">
            {/* Navigation breadcrumb + steps */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <div className="flex items-center gap-1.5">
                {flowSteps.map((s, index) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { if (s.id < step) { setStep(s.id); setError(null); } }}
                      disabled={s.id > step}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        step > s.id
                          ? "bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                          : step === s.id
                            ? "bg-[#202e46] text-white"
                            : "bg-slate-100 text-slate-400 cursor-default"
                      }`}
                    >
                      {step > s.id ? <Check className="w-3 h-3" /> : s.id}
                      <span className="hidden sm:inline">{s.name}</span>
                    </button>
                    {index < flowSteps.length - 1 && (
                      <div className={`w-4 h-px ${step > s.id ? "bg-emerald-300" : "bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>


            {errorMessages.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Complete the missing fields before continuing
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {errorMessages.map((message) => (
                    <li key={message}>• {message}</li>
                  ))}
                </ul>
              </div>
            )}

            <ContractDetailsForm
              contractType={selectedType}
              jurisdiction={jurisdiction}
              formData={formData}
              onChange={setFormData}
              errors={formErrors}
              customTitle={isCustomGenerationFlow ? intakeAnalysis?.contractTypeName || "Custom Contract" : undefined}
            />

            {/* Advanced options - collapsed by default to keep step 2 focused on core contract details */}
            {selectedType && !["nda_mutual", "nda_one_way", "safe_note"].includes(selectedType) && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(prev => !prev)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Advanced Options</h3>
                      <p className="text-sm text-slate-500">Payment collection and payout settings</p>
                    </div>
                  </div>
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </button>

                {showAdvancedOptions && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    {/* Require Payment Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Require Payment</p>
                        <p className="text-sm text-slate-500">Collect payment when contract is signed</p>
                      </div>
                      <button
                        onClick={() => setPaymentRequired(!paymentRequired)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          paymentRequired ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            paymentRequired ? "translate-x-6" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {paymentRequired && (
                      <div className="mt-4 space-y-4">
                        {/* Amount Display (derived from project details) */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Amount
                            </label>
                            <div className="relative">
                              <div className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium">
                                {derivedPaymentAmount > 0 ? (
                                  <span>${derivedPaymentAmount.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-400">Enter amount in project details above</span>
                                )}
                              </div>
                              {derivedPaymentAmount > 0 && (
                                <p className="text-xs text-slate-500 mt-1">From Total Amount in project details</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Currency
                            </label>
                            <select
                              value={paymentCurrency}
                              onChange={(e) =>
                                setPaymentCurrency(e.target.value as "usd" | "eur" | "gbp")
                              }
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            >
                              <option value="usd">USD ($)</option>
                              <option value="eur">EUR (€)</option>
                              <option value="gbp">GBP (£)</option>
                            </select>
                          </div>
                        </div>

                        {/* Payment Structure */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Payment Structure
                          </label>
                          <div className="grid md:grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setPaymentStructure("full")}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                paymentStructure === "full"
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <p className="font-medium text-slate-900">Full Payment</p>
                              <p className="text-xs text-slate-500 mt-1">Pay 100% upfront</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentStructure("deposit_balance")}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                paymentStructure === "deposit_balance"
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <p className="font-medium text-slate-900">Deposit + Balance</p>
                              <p className="text-xs text-slate-500 mt-1">Split payment</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentStructure("bnpl")}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                paymentStructure === "bnpl"
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <p className="font-medium text-slate-900">Buy Now, Pay Later</p>
                              <p className="text-xs text-slate-500 mt-1">Klarna / Afterpay</p>
                            </button>
                          </div>
                        </div>

                        {/* Deposit Details (only for deposit_balance) */}
                        {paymentStructure === "deposit_balance" && (
                          <div className="p-4 bg-emerald-50 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-slate-700">
                                Payment Split
                              </label>
                              <span className="text-sm font-semibold text-emerald-700">
                                {depositPercent}% deposit / {100 - depositPercent}% balance
                              </span>
                            </div>

                            {/* Percentage slider */}
                            <div className="space-y-1.5">
                              <input
                                type="range"
                                min={10}
                                max={90}
                                step={5}
                                value={depositPercent}
                                onChange={(e) => setDepositPercent(Number(e.target.value))}
                                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                              />
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>10%</span>
                                <span>50%</span>
                                <span>90%</span>
                              </div>
                            </div>

                            {derivedPaymentAmount > 0 ? (
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                  <p className="text-xs text-slate-500 mb-1">Deposit ({depositPercentage}%)</p>
                                  <p className="text-lg font-semibold text-emerald-600">
                                    ${derivedDepositAmount.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-slate-500">Due at signing</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                  <p className="text-xs text-slate-500 mb-1">Balance ({100 - depositPercentage}%)</p>
                                  <p className="text-lg font-semibold text-slate-900">
                                    ${(derivedPaymentAmount - derivedDepositAmount).toLocaleString()}
                                  </p>
                                  <p className="text-xs text-slate-500">Due on completion</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">Enter a total amount above to see the split</p>
                            )}
                          </div>
                        )}

                        {/* Info Box */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">How Payment Works</p>
                            <p className="mt-1">
                              {paymentStructure === "full" && `The signer will pay ${derivedPaymentAmount > 0 ? `$${derivedPaymentAmount.toLocaleString()}` : "the full amount"} when signing the contract. You'll receive funds via Stripe.`}
                              {paymentStructure === "deposit_balance" && `The signer pays $${derivedDepositAmount.toLocaleString()} (${depositPercentage}%) deposit upfront, and the remaining $${(derivedPaymentAmount - derivedDepositAmount).toLocaleString()} upon completion.`}
                              {paymentStructure === "bnpl" && `The signer can pay $${derivedPaymentAmount.toLocaleString()} in installments via Klarna or Afterpay. You receive the full amount immediately.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Generate */}
        {step === 3 && selectedType && (
          <div className="space-y-6">
            {/* Navigation breadcrumb + steps */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(2); setError(null); }}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <div className="flex items-center gap-1.5">
                {flowSteps.map((s, index) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { if (s.id < step) { setStep(s.id); setError(null); } }}
                      disabled={s.id > step}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        step > s.id
                          ? "bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                          : step === s.id
                            ? "bg-[#202e46] text-white"
                            : "bg-slate-100 text-slate-400 cursor-default"
                      }`}
                    >
                      {step > s.id ? <Check className="w-3 h-3" /> : s.id}
                      <span className="hidden sm:inline">{s.name}</span>
                    </button>
                    {index < flowSteps.length - 1 && (
                      <div className={`w-4 h-px ${step > s.id ? "bg-emerald-300" : "bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Ready to generate your contract
              </h2>
              <p className="text-slate-600 mt-2">
                Review your details and let AI create your customized contract.
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Contract Type</p>
                  <p className="font-medium text-slate-900">
                    {isCustomGenerationFlow
                      ? intakeAnalysis?.contractTypeName || "Custom Contract"
                      : CONTRACT_TYPES[selectedType]?.name || "Custom Contract"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Jurisdiction</p>
                  <p className="font-medium text-slate-900">
                    {JURISDICTION_NAMES[jurisdiction]}
                  </p>
                </div>
                {/* Show key details based on form data (exclude complex fields) */}
                {Object.entries(formData)
                  .filter(([key]) => !["signerGroups", "deliverables"].includes(key))
                  .slice(0, 4)
                  .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm text-slate-500">
                      {formatFieldLabel(key)}
                    </p>
                    <p className="font-medium text-slate-900">
                      {formatFieldValue(value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Signers Summary - Show when multi-signatory */}
              {(formData.signerGroups as SignerGroup[] | undefined)?.length && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Signers ({(formData.signerGroups as SignerGroup[]).reduce((acc, g) => acc + g.signers.length, 0)} total)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(formData.signerGroups as SignerGroup[]).map((group) => (
                      <div key={group.role} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-500 mb-2">{group.roleLabel}</p>
                        <div className="space-y-1">
                          {group.signers.map((signer, idx) => (
                            <div key={signer.id || idx} className="text-sm">
                              <span className="font-medium text-slate-900">{signer.name || "Unnamed"}</span>
                              {signer.title && <span className="text-slate-500"> · {signer.title}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Settings Summary - Only for service/work contracts */}
            {paymentRequired && selectedType && !["nda_mutual", "nda_one_way", "safe_note"].includes(selectedType) && (
              <div className="bg-white rounded-xl border border-emerald-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Payment Required</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Amount</p>
                    <p className="font-medium text-slate-900">
                      {derivedPaymentAmount > 0 ? `${paymentCurrency.toUpperCase()} ${derivedPaymentAmount.toLocaleString()}` : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Payment Structure</p>
                    <p className="font-medium text-slate-900">
                      {paymentStructure === "full" && "Full Payment Upfront"}
                      {paymentStructure === "deposit_balance" && `${depositPercentage}% Deposit + ${100 - depositPercentage}% Balance`}
                      {paymentStructure === "bnpl" && "Buy Now, Pay Later (Klarna/Afterpay)"}
                    </p>
                  </div>
                  {paymentStructure === "deposit_balance" && derivedPaymentAmount > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-slate-500">Deposit Amount</p>
                        <p className="font-medium text-emerald-600">
                          {paymentCurrency.toUpperCase()} {derivedDepositAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Balance Due</p>
                        <p className="font-medium text-slate-900">
                          {paymentCurrency.toUpperCase()} {(derivedPaymentAmount - derivedDepositAmount).toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* AI Generation Info */}
            <div className="bg-gradient-to-br from-[#529ec6]/5 to-[#529ec6]/10 rounded-xl border border-[#529ec6]/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#529ec6]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#529ec6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    AI-Powered Generation
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Our AI will generate a complete contract with all necessary
                    clauses tailored to your jurisdiction. You&apos;ll be able to
                    review, edit, and refine each clause before sending for
                    signature.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <div>{error}</div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry generation
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons — hidden only while step 1 still needs inline intake analysis */}
        {!(creationMode === "template" && step === 1) &&
          !(creationMode === "smart" && step === 1 && !intakeAnalysis) && (
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                step === 1
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step < maxStep ? (
              <button
                onClick={handleNext}
                disabled={stepOneContinueDisabled}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  stepOneContinueDisabled
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-[#202e46] text-white hover:bg-[#1a2539]"
                }`}
              >
                {step === 1 && creationMode === "smart" && isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    {stepOneContinueLabel}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-gradient-to-r from-[#202e46] to-[#2a3d5c] text-white hover:from-[#1a2539] hover:to-[#202e46] transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Contract
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Placeholder Fill-in Modal for System Templates */}
      {showPlaceholderModal && selectedTemplate && (
        <EnhancedPlaceholderModal
          template={selectedTemplate}
          placeholderValues={placeholderValues}
          onValuesChange={setPlaceholderValues}
          onSubmit={handlePlaceholderSubmit}
          onClose={() => {
            setShowPlaceholderModal(false);
            setSelectedTemplate(null);
            setIsUsingTemplate(false);
          }}
          isSubmitting={isUsingTemplate}
          jurisdiction={jurisdiction}
        />
      )}

      {/* Contract Generation Overlay */}
      <ContractGeneratingOverlay
        isVisible={isGenerating}
        contractType={selectedType || undefined}
        serverProgress={generationProgress}
        serverStatus={generationStatus}
        lastServerEventAt={generationLastEventAt}
      />

      {/* Contract Preview Modal */}
      {previewType && (
        <ContractPreviewModal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewType(null);
          }}
          contractType={previewType}
          contractName={CONTRACT_TYPES[previewType]?.name || previewType}
          onUseThis={() => {
            setShowPreview(false);
            handleTypeSelect(previewType, { advanceToDetails: true });
            setPreviewType(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Contract Details Form Component
// ============================================================================

function ContractDetailsForm({
  contractType,
  jurisdiction,
  formData,
  onChange,
  errors = {},
  customTitle,
}: {
  contractType: ContractType;
  jurisdiction: Jurisdiction;
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  customTitle?: string;
}) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...formData, [field]: value });
  };

  const updateNestedField = (parent: string, field: string, value: unknown) => {
    const current = (formData[parent] as Record<string, unknown>) || {};
    onChange({ ...formData, [parent]: { ...current, [field]: value } });
  };

  // For custom contracts (unsupported types), use the CustomContractForm
  if (customTitle) {
    return (
      <CustomContractForm
        formData={formData}
        onChange={onChange}
        customTitle={customTitle}
      />
    );
  }

  // Render form based on contract type
  switch (contractType) {
    case "nda_mutual":
    case "nda_one_way":
      return (
        <NDAForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          isMutual={contractType === "nda_mutual"}
          errors={errors}
        />
      );

    case "independent_contractor":
      return (
        <ContractorForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    case "consulting_agreement":
      return (
        <ConsultingForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    case "safe_note":
      return (
        <SAFEForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    case "freelance_service":
      return (
        <FreelanceForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    case "letter_of_intent":
      return (
        <LOIForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    case "cofounder_agreement":
      return (
        <CofounderForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    case "sales_contract":
      return (
        <SalesContractForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
          errors={errors}
        />
      );

    default:
      return <div>Form not available for this contract type</div>;
  }
}

// ============================================================================
// Individual Form Components
// ============================================================================

function NDAForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  isMutual,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  isMutual: boolean;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "disclosingParty",
      roleLabel: isMutual ? "Party A" : "Disclosing Party",
      name: (formData.disclosingParty as Record<string, string>)?.name || "",
      email: (formData.disclosingParty as Record<string, string>)?.email || "",
      company: (formData.disclosingParty as Record<string, string>)?.company || "",
    },
    {
      role: "receivingParty",
      roleLabel: isMutual ? "Party B" : "Receiving Party",
      name: (formData.receivingParty as Record<string, string>)?.name || "",
      email: (formData.receivingParty as Record<string, string>)?.email || "",
      company: (formData.receivingParty as Record<string, string>)?.company || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          { role: "disclosingParty", targetField: "disclosingParty", titleField: "company" },
          { role: "receivingParty", targetField: "receivingParty", titleField: "company" },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          {isMutual ? "Mutual NDA" : "One-Way NDA"} Details
        </h2>
        <p className="text-slate-600 mt-2">
          Enter the details for your non-disclosure agreement.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
        allowAddRole={isMutual}
        availableRoles={isMutual ? [
          { role: "additionalParty", label: "Additional Party" },
        ] : []}
      />

      {/* Agreement Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Agreement Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Effective Date"
            type="date"
            value={(formData.effectiveDate as string) || ""}
            onChange={(v) => updateField("effectiveDate", v)}
          />
          <FormInput
            label="Confidentiality Period (years)"
            type="number"
            value={(formData.confidentialityPeriod as string) || "2"}
            onChange={(v) => updateField("confidentialityPeriod", parseInt(v))}
          />
        </div>
        <div className="mt-4">
          <FormTextarea
            label="Purpose of Disclosure"
            value={(formData.purpose as string) || ""}
            onChange={(v) => updateField("purpose", v)}
            placeholder="Describe the business purpose for sharing confidential information..."
            required
            error={errors.purpose}
          />
        </div>
      </div>

      {/* Optional Clauses */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">
          Optional Clauses
        </h3>
        <div className="space-y-4">
          <FormCheckbox
            label="Include Non-Solicitation Clause"
            description="Prevents parties from hiring each other's employees"
            checked={(formData.includeNonSolicit as boolean) || false}
            onChange={(v) => updateField("includeNonSolicit", v)}
          />
          <FormCheckbox
            label="Include Non-Compete Clause"
            description="Restricts competition in the same business area"
            checked={(formData.includeNonCompete as boolean) || false}
            onChange={(v) => updateField("includeNonCompete", v)}
          />
          {(formData.includeNonCompete as boolean) && (
            <div className="ml-7 mt-2">
              <FormInput
                label="Non-Compete Period (months)"
                type="number"
                value={(formData.nonCompetePeriod as string) || "12"}
                onChange={(v) => updateField("nonCompetePeriod", parseInt(v))}
                placeholder="12"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContractorForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "client",
      roleLabel: "Client (Company)",
      name: (formData.client as Record<string, string>)?.name || "",
      email: (formData.client as Record<string, string>)?.email || "",
    },
    {
      role: "contractor",
      roleLabel: "Contractor",
      name: (formData.contractor as Record<string, string>)?.name || "",
      email: (formData.contractor as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          { role: "client", targetField: "client" },
          { role: "contractor", targetField: "contractor" },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Independent Contractor Agreement Details
        </h2>
        <p className="text-slate-600 mt-2">
          Enter the details for your contractor agreement.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
      />

      {/* Services & Payment */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Services & Payment</h3>
        <div className="space-y-4">
          <FormTextarea
            label="Description of Services"
            value={(formData.servicesDescription as string) || ""}
            onChange={(v) => updateField("servicesDescription", v)}
            placeholder="Describe the services the contractor will provide..."
            required
            error={errors.servicesDescription}
          />
          <div className="grid md:grid-cols-3 gap-4">
            <FormInput
              label="Payment Amount ($)"
              type="number"
              value={(formData.paymentAmount as string) || ""}
              onChange={(v) => updateField("paymentAmount", parseFloat(v))}
              placeholder="5000"
            />
            <FormSelect
              label="Payment Frequency"
              value={(formData.paymentFrequency as string) || "monthly"}
              onChange={(v) => updateField("paymentFrequency", v)}
              options={[
                { value: "hourly", label: "Hourly" },
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "project", label: "Per Project" },
                { value: "milestone", label: "Per Milestone" },
              ]}
            />
            <FormInput
              label="Payment Terms (days)"
              type="number"
              value={(formData.paymentTerms as string) || "30"}
              onChange={(v) => updateField("paymentTerms", parseInt(v))}
            />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Duration</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Start Date"
            type="date"
            value={(formData.effectiveDate as string) || ""}
            onChange={(v) => updateField("effectiveDate", v)}
          />
          <FormInput
            label="End Date (optional)"
            type="date"
            value={(formData.endDate as string) || ""}
            onChange={(v) => updateField("endDate", v)}
          />
        </div>
      </div>
    </div>
  );
}

function ConsultingForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "client",
      roleLabel: "Client",
      name: (formData.client as Record<string, string>)?.name || "",
      email: (formData.client as Record<string, string>)?.email || "",
    },
    {
      role: "consultant",
      roleLabel: "Consultant",
      name: (formData.consultant as Record<string, string>)?.name || "",
      email: (formData.consultant as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          { role: "client", targetField: "client" },
          { role: "consultant", targetField: "consultant" },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Consulting Agreement Details
        </h2>
        <p className="text-slate-600 mt-2">
          Enter the details for your consulting engagement.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Engagement Details</h3>
        <FormTextarea
          label="Consulting Scope"
          value={(formData.consultingScope as string) || ""}
          onChange={(v) => updateField("consultingScope", v)}
          placeholder="Describe the consulting services and scope of work..."
          required
          error={errors.consultingScope}
        />
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <FormInput
            label="Hourly Rate ($)"
            type="number"
            value={(formData.hourlyRate as string) || ""}
            onChange={(v) => updateField("hourlyRate", parseFloat(v))}
          />
          <FormInput
            label="Monthly Retainer ($)"
            type="number"
            value={(formData.retainerAmount as string) || ""}
            onChange={(v) => updateField("retainerAmount", parseFloat(v))}
          />
          <FormInput
            label="Effective Date"
            type="date"
            value={(formData.effectiveDate as string) || ""}
            onChange={(v) => updateField("effectiveDate", v)}
          />
        </div>
      </div>
    </div>
  );
}

function SAFEForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "company",
      roleLabel: "Company",
      name: (formData.company as Record<string, string>)?.name || "",
      email: (formData.company as Record<string, string>)?.email || "",
    },
    {
      role: "investor",
      roleLabel: "Investor",
      name: (formData.investor as Record<string, string>)?.name || "",
      email: (formData.investor as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          { role: "company", targetField: "company" },
          { role: "investor", targetField: "investor" },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">SAFE Note Details</h2>
        <p className="text-slate-600 mt-2">
          Simple Agreement for Future Equity - Y Combinator standard.
        </p>
      </div>

      {/* Dynamic Signers Section - allows multiple founders or investors */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
        allowAddRole={true}
        availableRoles={[
          { role: "additionalInvestor", label: "Additional Investor" },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Investment Terms</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Investment Amount ($)"
            type="number"
            value={(formData.investmentAmount as string) || ""}
            onChange={(v) => updateField("investmentAmount", parseFloat(v))}
            placeholder="50000"
            required
            error={errors.investmentAmount}
          />
          <FormSelect
            label="SAFE Type"
            value={(formData.safeType as string) || "valuation_cap"}
            onChange={(v) => updateField("safeType", v)}
            options={[
              { value: "valuation_cap", label: "Valuation Cap Only" },
              { value: "discount", label: "Discount Only" },
              { value: "cap_and_discount", label: "Cap + Discount" },
              { value: "mfn", label: "Most Favored Nation" },
            ]}
          />
          <FormInput
            label="Valuation Cap ($)"
            type="number"
            value={(formData.valuationCap as string) || ""}
            onChange={(v) => updateField("valuationCap", parseFloat(v))}
            placeholder="10000000"
          />
          <FormInput
            label="Discount Rate (%)"
            type="number"
            value={(formData.discountRate as string) || ""}
            onChange={(v) => updateField("discountRate", parseFloat(v))}
            placeholder="20"
          />
        </div>
        <div className="mt-4">
          <FormCheckbox
            label="Include Pro Rata Rights"
            description="Right to maintain ownership percentage in future rounds"
            checked={(formData.proRataRights as boolean) || false}
            onChange={(v) => updateField("proRataRights", v)}
          />
        </div>
      </div>
    </div>
  );
}

// Custom Contract Form - for unsupported contract types
// Only shows signers, since contract-specific details were already collected in intake
function CustomContractForm({
  formData,
  onChange,
  customTitle,
}: {
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  customTitle: string;
}) {
  // Initialize signer groups from form data or create defaults with generic labels
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "partyA",
      roleLabel: "First Party",
      name: (formData.partyA as Record<string, string>)?.name || "",
      email: (formData.partyA as Record<string, string>)?.email || "",
    },
    {
      role: "partyB",
      roleLabel: "Second Party",
      name: (formData.partyB as Record<string, string>)?.name || "",
      email: (formData.partyB as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          {
            role: "partyA",
            targetField: "partyA",
            titleField: "title",
            staticFields: { role: "party_a" },
          },
          {
            role: "partyB",
            targetField: "partyB",
            titleField: "title",
            staticFields: { role: "party_b" },
          },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          {customTitle} Details
        </h2>
        <p className="text-slate-600 mt-2">
          Add the parties who will sign this contract. Contract details were captured in the previous step.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
      />

      {/* Info box about custom contract generation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Custom Contract</p>
            <p className="text-sm text-amber-700 mt-1">
              Our AI will generate this {customTitle.toLowerCase()} using the details you provided.
              You&apos;ll be able to review and edit all clauses before sending for signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreelanceForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "client",
      roleLabel: "Client",
      name: (formData.client as Record<string, string>)?.name || "",
      email: (formData.client as Record<string, string>)?.email || "",
    },
    {
      role: "freelancer",
      roleLabel: "Freelancer",
      name: (formData.freelancer as Record<string, string>)?.name || "",
      email: (formData.freelancer as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          { role: "client", targetField: "client" },
          { role: "freelancer", targetField: "freelancer" },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Freelance Service Agreement Details
        </h2>
        <p className="text-slate-600 mt-2">
          Project-based agreement for freelance work.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Project Details</h3>
        <div className="space-y-4">
          <FormInput
            label="Project Name"
            value={(formData.projectName as string) || ""}
            onChange={(v) => updateField("projectName", v)}
            placeholder="Website Redesign"
            required
            error={errors.projectName}
          />
          <FormTextarea
            label="Project Description"
            value={(formData.projectDescription as string) || ""}
            onChange={(v) => updateField("projectDescription", v)}
            placeholder="Describe the project scope and deliverables..."
            required
            error={errors.projectDescription}
          />
          <div className="grid md:grid-cols-3 gap-4">
            <FormInput
              label="Total Amount ($)"
              type="number"
              value={(formData.totalAmount as string) || ""}
              onChange={(v) => updateField("totalAmount", parseFloat(v))}
            />
            <FormInput
              label="Deposit ($)"
              type="number"
              value={(formData.depositAmount as string) || ""}
              onChange={(v) => updateField("depositAmount", parseFloat(v))}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Revision Rounds
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.revisionRounds === -1 ? "" : ((formData.revisionRounds as string) || "2")}
                  onChange={(e) => updateField("revisionRounds", e.target.value ? parseInt(e.target.value) : 2)}
                  disabled={formData.revisionRounds === -1}
                  placeholder="2"
                  className={`flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent ${
                    formData.revisionRounds === -1 ? "bg-slate-100 text-slate-400" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => updateField("revisionRounds", formData.revisionRounds === -1 ? 2 : -1)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    formData.revisionRounds === -1
                      ? "bg-[#529ec6]/10 border-[#529ec6]/30 text-[#202e46]"
                      : "bg-white border-slate-200 text-slate-600 hover:border-[#529ec6]/30"
                  }`}
                >
                  Unlimited
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LOIForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "proposingParty",
      roleLabel: "Proposing Party",
      name: (formData.proposingParty as Record<string, string>)?.name || "",
      email: (formData.proposingParty as Record<string, string>)?.email || "",
    },
    {
      role: "receivingParty",
      roleLabel: "Receiving Party",
      name: (formData.receivingParty as Record<string, string>)?.name || "",
      email: (formData.receivingParty as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          {
            role: "proposingParty",
            targetField: "proposingParty",
            titleField: "company",
            staticFields: { role: "proposing_party" },
          },
          {
            role: "receivingParty",
            targetField: "receivingParty",
            titleField: "company",
            staticFields: { role: "receiving_party" },
          },
        ],
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Letter of Intent Details</h2>
        <p className="text-slate-600 mt-2">
          Non-binding agreement outlining terms for a future deal.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
      />

      {/* Transaction Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Transaction Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Transaction Type
            </label>
            <select
              value={(formData.transactionType as string) || "acquisition"}
              onChange={(e) => updateField("transactionType", e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            >
              <option value="acquisition">Acquisition</option>
              <option value="investment">Investment</option>
              <option value="partnership">Partnership</option>
              <option value="real_estate">Real Estate</option>
              <option value="employment">Employment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FormTextarea
            label="Transaction Description"
            value={(formData.transactionDescription as string) || ""}
            onChange={(v) => updateField("transactionDescription", v)}
            placeholder="Describe the proposed transaction in detail..."
            required
            error={errors.transactionDescription}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Proposed Price/Value ($)"
              type="number"
              value={(formData.proposedPrice as string) || ""}
              onChange={(v) => updateField("proposedPrice", parseFloat(v) || 0)}
            />
            <FormInput
              label="Effective Date"
              type="date"
              value={(formData.effectiveDate as string) || ""}
              onChange={(v) => updateField("effectiveDate", v)}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Exclusivity Period (days)"
              type="number"
              value={(formData.exclusivityPeriod as string) || "60"}
              onChange={(v) => updateField("exclusivityPeriod", parseInt(v) || 60)}
            />
            <FormInput
              label="Due Diligence Period (days)"
              type="number"
              value={(formData.dueDiligencePeriod as string) || "45"}
              onChange={(v) => updateField("dueDiligencePeriod", parseInt(v) || 45)}
            />
          </div>
          <FormInput
            label="Expiration Date"
            type="date"
            value={(formData.expirationDate as string) || ""}
            onChange={(v) => updateField("expirationDate", v)}
          />
        </div>
      </div>

      {/* Binding Terms */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Binding Provisions</h3>
        <p className="text-sm text-slate-500 mb-4">Select which provisions should be legally binding:</p>
        <div className="space-y-3">
          <FormCheckbox
            label="Confidentiality"
            description="Both parties agree to keep deal discussions private"
            checked={((formData.bindingTerms as string[]) || ["confidentiality", "exclusivity"]).includes("confidentiality")}
            onChange={(checked) => {
              const current = (formData.bindingTerms as string[]) || ["confidentiality", "exclusivity"];
              updateField("bindingTerms", checked ? [...current, "confidentiality"] : current.filter(t => t !== "confidentiality"));
            }}
          />
          <FormCheckbox
            label="Exclusivity"
            description="Neither party will negotiate with others during exclusivity period"
            checked={((formData.bindingTerms as string[]) || ["confidentiality", "exclusivity"]).includes("exclusivity")}
            onChange={(checked) => {
              const current = (formData.bindingTerms as string[]) || ["confidentiality", "exclusivity"];
              updateField("bindingTerms", checked ? [...current, "exclusivity"] : current.filter(t => t !== "exclusivity"));
            }}
          />
          <FormCheckbox
            label="Expenses"
            description="Each party bears their own costs"
            checked={((formData.bindingTerms as string[]) || []).includes("expenses")}
            onChange={(checked) => {
              const current = (formData.bindingTerms as string[]) || [];
              updateField("bindingTerms", checked ? [...current, "expenses"] : current.filter(t => t !== "expenses"));
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CofounderForm({
  formData,
  updateField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize co-founders array
  const cofounders = (formData.cofounders as Array<{
    name: string;
    email: string;
    equityPercentage: number;
    role: string;
    vestingMonths: number;
    cliffMonths: number;
  }>) || [
    { name: "", email: "", equityPercentage: 50, role: "CEO", vestingMonths: 48, cliffMonths: 12 },
    { name: "", email: "", equityPercentage: 50, role: "CTO", vestingMonths: 48, cliffMonths: 12 },
  ];

  const updateCofounder = (index: number, field: string, value: unknown) => {
    const updated = [...cofounders];
    updated[index] = { ...updated[index], [field]: value };
    updateField("cofounders", updated);
  };

  const addCofounder = () => {
    const totalEquity = cofounders.reduce((sum, c) => sum + (c.equityPercentage || 0), 0);
    const remainingEquity = Math.max(0, 100 - totalEquity);
    updateField("cofounders", [
      ...cofounders,
      { name: "", email: "", equityPercentage: remainingEquity, role: "", vestingMonths: 48, cliffMonths: 12 },
    ]);
  };

  const removeCofounder = (index: number) => {
    if (cofounders.length > 2) {
      updateField("cofounders", cofounders.filter((_, i) => i !== index));
    }
  };

  const totalEquity = cofounders.reduce((sum, c) => sum + (c.equityPercentage || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Co-Founder Agreement Details</h2>
        <p className="text-slate-600 mt-2">
          Define equity splits, roles, vesting, and exit terms.
        </p>
      </div>

      {/* Company Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Company Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Company Name"
            value={(formData.companyName as string) || ""}
            onChange={(v) => updateField("companyName", v)}
            placeholder="Acme Inc"
            required
            error={errors.companyName}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Type
            </label>
            <select
              value={(formData.companyType as string) || "corporation"}
              onChange={(e) => updateField("companyType", e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            >
              <option value="corporation">Corporation (C-Corp/S-Corp)</option>
              <option value="llc">LLC</option>
              <option value="partnership">Partnership</option>
              <option value="not_yet_formed">Not Yet Formed</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <FormInput
            label="Effective Date"
            type="date"
            value={(formData.effectiveDate as string) || ""}
            onChange={(v) => updateField("effectiveDate", v)}
          />
        </div>
      </div>

      {/* Co-Founders */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Co-Founders</h3>
          <div className={`text-sm font-medium ${totalEquity === 100 ? "text-green-600" : "text-amber-600"}`}>
            Total Equity: {totalEquity}%
            {totalEquity !== 100 && " (must equal 100%)"}
          </div>
        </div>
        {errors.cofounders && <p className="text-sm text-red-600 mb-4">{errors.cofounders}</p>}
        {errors.totalEquity && <p className="text-sm text-red-600 mb-4">{errors.totalEquity}</p>}

        <div className="space-y-6">
          {cofounders.map((cofounder, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-slate-900">Co-Founder {index + 1}</h4>
                {cofounders.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeCofounder(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Name"
                  value={cofounder.name || ""}
                  onChange={(v) => updateCofounder(index, "name", v)}
                  placeholder="Jane Doe"
                  required
                  error={errors[`cofounder_${index}_name`]}
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={cofounder.email || ""}
                  onChange={(v) => updateCofounder(index, "email", v)}
                  placeholder="jane@company.com"
                  required
                  error={errors[`cofounder_${index}_email`]}
                />
                <FormInput
                  label="Role/Title"
                  value={cofounder.role || ""}
                  onChange={(v) => updateCofounder(index, "role", v)}
                  placeholder="CEO, CTO, etc."
                />
                <FormInput
                  label="Equity %"
                  type="number"
                  value={String(cofounder.equityPercentage || "")}
                  onChange={(v) => updateCofounder(index, "equityPercentage", parseFloat(v) || 0)}
                  required
                  error={errors[`cofounder_${index}_equity`]}
                />
                <FormInput
                  label="Vesting Period (months)"
                  type="number"
                  value={String(cofounder.vestingMonths || 48)}
                  onChange={(v) => updateCofounder(index, "vestingMonths", parseInt(v) || 48)}
                />
                <FormInput
                  label="Cliff Period (months)"
                  type="number"
                  value={String(cofounder.cliffMonths || 12)}
                  onChange={(v) => updateCofounder(index, "cliffMonths", parseInt(v) || 12)}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCofounder}
          className="mt-4 w-full py-2 text-sm font-medium text-[#529ec6] border border-dashed border-[#529ec6]/30 rounded-lg hover:bg-[#529ec6]/5 transition-colors"
        >
          + Add Another Co-Founder
        </button>
      </div>

      {/* Decision Making */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Decision Making</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Major Decision Threshold (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={(formData.majorDecisionThreshold as number) || 66}
              onChange={(e) => updateField("majorDecisionThreshold", parseInt(e.target.value) || 66)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            />
            <p className="text-xs text-slate-500 mt-1">% of equity required to approve major decisions</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deadlock Resolution
            </label>
            <select
              value={(formData.deadlockResolution as string) || "mediation"}
              onChange={(e) => updateField("deadlockResolution", e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            >
              <option value="mediation">Mediation</option>
              <option value="buyout">Buyout Right</option>
              <option value="dissolution">Dissolution</option>
              <option value="third_party">Third Party Arbitration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exit Provisions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Exit Provisions</h3>
        <div className="space-y-3">
          <FormCheckbox
            label="Right of First Refusal (ROFR)"
            description="Other founders get first right to buy departing founder's shares"
            checked={(formData.rightOfFirstRefusal as boolean) ?? true}
            onChange={(v) => updateField("rightOfFirstRefusal", v)}
          />
          <FormCheckbox
            label="Drag-Along Rights"
            description="Majority can force minority to join in a company sale"
            checked={(formData.dragAlong as boolean) ?? true}
            onChange={(v) => updateField("dragAlong", v)}
          />
          <FormCheckbox
            label="Tag-Along Rights"
            description="Minority can join in if majority sells their shares"
            checked={(formData.tagAlong as boolean) ?? true}
            onChange={(v) => updateField("tagAlong", v)}
          />
        </div>
      </div>
    </div>
  );
}

function SalesContractForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
  errors = {},
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups = getOrCreateSignerGroups(formData, [
    {
      role: "seller",
      roleLabel: "Seller",
      name: (formData.seller as Record<string, string>)?.name || "",
      email: (formData.seller as Record<string, string>)?.email || "",
    },
    {
      role: "buyer",
      roleLabel: "Buyer",
      name: (formData.buyer as Record<string, string>)?.name || "",
      email: (formData.buyer as Record<string, string>)?.email || "",
    },
  ]);

  const handleSignerGroupsChange = (groups: SignerGroup[]) => {
    onChange(
      buildSignerGroupFormUpdates({
        formData,
        groups,
        mappings: [
          {
            role: "seller",
            targetField: "seller",
            titleField: "company",
            staticFields: { role: "seller" },
          },
          {
            role: "buyer",
            targetField: "buyer",
            titleField: "company",
            staticFields: { role: "buyer" },
          },
        ],
      })
    );
  };

  // Product items
  const products = (formData.products as Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  }>) || [{ name: "", quantity: 1, unitPrice: 0, description: "" }];

  const updateProduct = (index: number, field: string, value: unknown) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    updateField("products", updated);
    // Auto-calculate total
    const total = updated.reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);
    updateField("totalAmount", total);
  };

  const addProduct = () => {
    updateField("products", [...products, { name: "", quantity: 1, unitPrice: 0, description: "" }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      const updated = products.filter((_, i) => i !== index);
      updateField("products", updated);
      const total = updated.reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);
      updateField("totalAmount", total);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Sales Contract Details</h2>
        <p className="text-slate-600 mt-2">
          Agreement for the sale of goods or products.
        </p>
      </div>

      {/* Dynamic Signers Section */}
      <DynamicSignersSection
        signerGroups={signerGroups}
        onChange={handleSignerGroupsChange}
      />

      {/* Product Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Products/Goods</h3>
        <FormTextarea
          label="General Product Description"
          value={(formData.productDescription as string) || ""}
          onChange={(v) => updateField("productDescription", v)}
          placeholder="Describe the products being sold..."
          required
          error={errors.productDescription}
        />

        <div className="mt-6 space-y-4">
          {products.map((product, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-900">Item {index + 1}</h4>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <FormInput
                    label="Product Name"
                    value={product.name || ""}
                    onChange={(v) => updateProduct(index, "name", v)}
                    placeholder="Widget Pro 2000"
                  />
                </div>
                <FormInput
                  label="Quantity"
                  type="number"
                  value={String(product.quantity || 1)}
                  onChange={(v) => updateProduct(index, "quantity", parseInt(v) || 1)}
                />
                <FormInput
                  label="Unit Price ($)"
                  type="number"
                  value={String(product.unitPrice || "")}
                  onChange={(v) => updateProduct(index, "unitPrice", parseFloat(v) || 0)}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addProduct}
          className="mt-4 w-full py-2 text-sm font-medium text-[#529ec6] border border-dashed border-[#529ec6]/30 rounded-lg hover:bg-[#529ec6]/5 transition-colors"
        >
          + Add Another Product
        </button>

        <div className="mt-4 p-4 bg-[#529ec6]/5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">Total Amount</span>
            <span className="text-xl font-bold text-[#529ec6]">
              ${((formData.totalAmount as number) || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Payment Terms</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={(formData.paymentMethod as string) || "net_30"}
              onChange={(e) => updateField("paymentMethod", e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            >
              <option value="full_upfront">Full Payment Upfront</option>
              <option value="net_30">Net 30</option>
              <option value="net_60">Net 60</option>
              <option value="installments">Installments</option>
              <option value="on_delivery">Payment on Delivery</option>
            </select>
          </div>
          <FormInput
            label="Deposit Amount ($)"
            type="number"
            value={(formData.depositAmount as string) || ""}
            onChange={(v) => updateField("depositAmount", parseFloat(v) || 0)}
          />
        </div>
      </div>

      {/* Delivery Terms */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Delivery Terms</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Delivery Method
            </label>
            <select
              value={(formData.deliveryMethod as string) || "shipping"}
              onChange={(e) => updateField("deliveryMethod", e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            >
              <option value="pickup">Buyer Pickup</option>
              <option value="delivery">Seller Delivery</option>
              <option value="shipping">Shipping</option>
            </select>
          </div>
          <FormInput
            label="Estimated Delivery Date"
            type="date"
            value={(formData.deliveryDate as string) || ""}
            onChange={(v) => updateField("deliveryDate", v)}
          />
          <div className="md:col-span-2">
            <FormInput
              label="Delivery Location"
              value={(formData.deliveryLocation as string) || ""}
              onChange={(v) => updateField("deliveryLocation", v)}
              placeholder="Address for delivery"
            />
          </div>
        </div>
      </div>

      {/* Warranty */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Warranty</h3>
        <div className="space-y-4">
          <FormCheckbox
            label="Include Warranty"
            description="Seller provides warranty on the goods"
            checked={(formData.includeWarranty as boolean) ?? true}
            onChange={(v) => updateField("includeWarranty", v)}
          />
          {(formData.includeWarranty as boolean) !== false && (
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="Warranty Period (months)"
                type="number"
                value={(formData.warrantyMonths as string) || "12"}
                onChange={(v) => updateField("warrantyMonths", parseInt(v) || 12)}
              />
              <FormInput
                label="Effective Date"
                type="date"
                value={(formData.effectiveDate as string) || ""}
                onChange={(v) => updateField("effectiveDate", v)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Smart Templates Banner Component
// ============================================================================

function SmartTemplatesBanner() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/contacts/sync", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setSyncResult({ created: data.created, updated: data.updated });
      }
    } catch (error) {
      console.error("Error syncing contacts:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#529ec6]/5 to-[#529ec6]/10 border border-[#529ec6]/20 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#529ec6]" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Smart Auto-Fill</h3>
            <p className="text-sm text-slate-600 mt-1">
              Start typing to see suggestions from your frequently used contacts.
              We learn from your past contracts to speed up your workflow.
            </p>
            {syncResult && (
              <p className="text-xs text-[#529ec6] mt-2">
                Synced {syncResult.created} new + {syncResult.updated} updated contacts
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#202e46] bg-white border border-[#529ec6]/20 rounded-lg hover:bg-[#529ec6]/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync Contacts"}</span>
        </button>
      </div>
    </div>
  );
}

function ContractTypeSelectionCard({
  type,
  isSelected,
  onSelect,
  onPreview,
  accent = "default",
  badgeLabel,
}: {
  type: (typeof CONTRACT_TYPES)[ContractType];
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  accent?: "default" | "recommended";
  badgeLabel?: string;
}) {
  const Icon = CONTRACT_ICONS[type.icon] || Shield;
  const isRecommended = accent === "recommended";

  return (
    <div
      className={`relative rounded-xl border-2 p-5 text-left transition-all ${
        isSelected
          ? "border-[#529ec6] bg-[#529ec6]/5 ring-2 ring-[#529ec6]/20"
          : isRecommended
            ? "border-amber-200 bg-gradient-to-br from-amber-50/50 to-white hover:border-[#529ec6]/30"
            : "border-slate-200 bg-white hover:border-[#529ec6]/30"
      }`}
    >
      {badgeLabel && (
        <div className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
          {badgeLabel}
        </div>
      )}

      <button type="button" onClick={onSelect} className="w-full text-left">
        <div
          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
            isSelected
              ? "bg-[#529ec6]/10"
              : isRecommended
                ? "bg-amber-100"
                : "bg-slate-100"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              isSelected
                ? "text-[#529ec6]"
                : isRecommended
                  ? "text-amber-700"
                  : "text-slate-600"
            }`}
          />
        </div>
        <h3 className="mb-1 font-semibold text-slate-900">{type.name}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{type.description}</p>
      </button>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Sparkles className="h-3 w-3" />
          <span>~{type.estimatedTime}</span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="flex items-center gap-1 text-xs font-medium text-[#529ec6] hover:text-[#3d7a9e]"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Form Components
// ============================================================================

function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent ${
          error ? "border-red-300 bg-red-50" : "border-slate-200"
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none ${
          error ? "border-red-300 bg-red-50" : "border-slate-200"
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormCheckbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 text-[#529ec6] border-slate-300 rounded focus:ring-[#529ec6]"
      />
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </label>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatFieldValue(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    if ("name" in value) return (value as { name: string }).name;
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

type SignerSyncMapping = {
  role: string;
  targetField: string;
  titleField?: "company" | "title";
  staticFields?: Record<string, unknown>;
};

function getOrCreateSignerGroups(
  formData: Record<string, unknown>,
  defaults: Parameters<typeof createSignerGroups>[0]
): SignerGroup[] {
  return (formData.signerGroups as SignerGroup[]) || createSignerGroups(defaults);
}

function buildSignerGroupFormUpdates({
  formData,
  groups,
  mappings,
}: {
  formData: Record<string, unknown>;
  groups: SignerGroup[];
  mappings: SignerSyncMapping[];
}): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    ...formData,
    signerGroups: groups,
  };

  mappings.forEach((mapping) => {
    const signer = groups.find((group) => group.role === mapping.role)?.signers[0];
    if (!signer) return;

    const party: Record<string, unknown> = {
      name: signer.name,
      email: signer.email,
      ...mapping.staticFields,
    };

    if (mapping.titleField) {
      party[mapping.titleField] = signer.title || "";
    }

    updates[mapping.targetField] = party;
  });

  return updates;
}
