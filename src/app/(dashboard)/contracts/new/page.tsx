"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  DollarSign,
  Info,
  RefreshCw,
  FileStack,
  Play,
  X,
} from "lucide-react";

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
  type ContractType,
  type Jurisdiction,
} from "@/lib/contracts/schemas";
import { ContactInput } from "@/components/contacts/ContactAutocomplete";
import { DynamicSignersSection, type SignerGroup, createSignerGroups } from "@/components/dynamic-signers";
import type { Template } from "@/db/types";

// Step indicators
const STEPS = [
  { id: 1, name: "Describe", description: "Tell us what you need" },
  { id: 2, name: "Details", description: "Enter the specifics" },
  { id: 3, name: "Review", description: "Generate with AI" },
];

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
};

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creation mode state - default to smart intake
  const [creationMode, setCreationMode] = useState<"smart" | "manual" | "template">("smart");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);

  // Smart intake state
  const [intakeDescription, setIntakeDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intakeAnalysis, setIntakeAnalysis] = useState<IntakeAnalysis | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

  // Placeholder modal state for system templates
  const [selectedTemplate, setSelectedTemplate] = useState<(Template & { content?: { placeholders?: Placeholder[] } }) | null>(null);
  const [showPlaceholderModal, setShowPlaceholderModal] = useState(false);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  // Form state
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us_california");
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Payment settings state
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState("usd");
  const [paymentStructure, setPaymentStructure] = useState<"full" | "deposit_balance" | "bnpl">("full");

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
    // Calculate default 30% deposit if not specified
    return Math.round(derivedPaymentAmount * 0.3);
  })();

  // Calculate deposit percentage from amounts
  const depositPercentage = derivedPaymentAmount > 0
    ? Math.round((derivedDepositAmount / derivedPaymentAmount) * 100)
    : 30;

  const handleTypeSelect = (type: ContractType) => {
    setSelectedType(type);
    setFormData({}); // Reset form data when type changes
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze your request");
      }

      const data = await response.json();
      setIntakeAnalysis(data.analysis);

      // Pre-select the suggested type and jurisdiction
      setSelectedType(data.analysis.suggestedType as ContractType);
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
    setFollowUpAnswers({});
    setSelectedType(null);
    setFormData({});
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = async () => {
    if (!selectedType) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Build the metadata based on contract type
      const metadata = buildMetadata(selectedType, jurisdiction, formData);

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

      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType: selectedType,
          metadata,
          paymentConfig,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate contract");
      }

      const data = await response.json();
      router.push(`/contracts/${data.contract.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
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
  }, [creationMode, templateSearch]);

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
      createContractFromTemplate(template.id);
    }
  };

  // Actually create the contract from template (with optional placeholder values)
  const createContractFromTemplate = async (templateId: string, values?: Record<string, string>) => {
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
      router.push(`/contracts/${data.contract.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsUsingTemplate(false);
    }
  };

  // Handle submitting the placeholder form
  const handlePlaceholderSubmit = () => {
    if (!selectedTemplate) return;
    createContractFromTemplate(selectedTemplate.id, placeholderValues);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              Create New Contract
            </h1>
            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > s.id
                        ? "bg-emerald-500 text-white"
                        : step === s.id
                          ? "bg-violet-600 text-white"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p
                      className={`text-sm font-medium ${step >= s.id ? "text-slate-900" : "text-slate-500"}`}
                    >
                      {s.name}
                    </p>
                    <p className="text-xs text-slate-500">{s.description}</p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-16 sm:w-24 h-0.5 mx-4 ${step > s.id ? "bg-emerald-500" : "bg-slate-200"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step 1: Smart Intake / Choose Contract Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                {creationMode === "smart"
                  ? "What kind of agreement do you need?"
                  : creationMode === "manual"
                    ? "Select a contract type"
                    : "Choose a template to start"}
              </h2>
              <p className="text-slate-600 mt-2">
                {creationMode === "smart"
                  ? "Describe your situation and we'll create the perfect contract for you."
                  : creationMode === "manual"
                    ? "Pick from our standard contract types."
                    : "Start from a saved template and customize it for your needs."}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  onClick={() => { setCreationMode("smart"); handleResetIntake(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    creationMode === "smart"
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Describe Need
                </button>
                <button
                  onClick={() => { setCreationMode("manual"); handleResetIntake(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    creationMode === "manual"
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Pick Type
                </button>
                <button
                  onClick={() => setCreationMode("template")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    creationMode === "template"
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileStack className="w-4 h-4" />
                  Use Template
                </button>
              </div>
            </div>

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
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Describe what you need</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Tell us about your situation in plain English. Include details like who&apos;s involved,
                        what work is being done, payment amounts, and location.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={intakeDescription}
                    onChange={(e) => setIntakeDescription(e.target.value)}
                    placeholder="Example: I'm hiring a freelance designer in California for a 3-month project to redesign our company website. The total budget is $15,000 with a 30% deposit upfront..."
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none text-slate-900 placeholder:text-slate-400"
                    disabled={isAnalyzing}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">
                      {intakeDescription.length} characters
                      {intakeDescription.length < 10 && intakeDescription.length > 0 && (
                        <span className="text-amber-600 ml-2">(minimum 10)</span>
                      )}
                    </p>
                    <button
                      onClick={handleAnalyzeIntake}
                      disabled={isAnalyzing || intakeDescription.length < 10}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>

                {/* Example prompts */}
                <div className="mt-6">
                  <p className="text-sm text-slate-500 mb-3 text-center">Or try an example:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "I need an NDA to share confidential business plans with a potential investor",
                      "Hiring a contractor to build a mobile app for $25,000 over 4 months",
                      "Need a consulting agreement for advisory services at $200/hour",
                    ].map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => setIntakeDescription(example)}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                      >
                        {example.length > 50 ? example.substring(0, 50) + "..." : example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Smart Intake Analysis Result */}
            {creationMode === "smart" && intakeAnalysis && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Suggested Contract Type */}
                <div className="bg-white rounded-xl border-2 border-violet-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                        {(() => {
                          const Icon = CONTRACT_ICONS[intakeAnalysis.contractTypeIcon] || Shield;
                          return <Icon className="w-6 h-6 text-violet-600" />;
                        })()}
                      </div>
                      <div>
                        <p className="text-sm text-violet-600 font-medium">Recommended Contract</p>
                        <h3 className="text-xl font-bold text-slate-900">{intakeAnalysis.contractTypeName}</h3>
                      </div>
                    </div>
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
                  </div>
                  <p className="text-slate-600 mb-4">{intakeAnalysis.reasoning}</p>

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
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
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
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCreationMode("manual")}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        Pick different type
                      </button>
                      <button
                        onClick={handleConfirmIntake}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Mode - Contract Type Selection */}
            {creationMode === "manual" && (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.values(CONTRACT_TYPES).map((type) => {
                    const Icon = CONTRACT_ICONS[type.icon] || Shield;
                    const isSelected = selectedType === type.id;

                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        className={`p-6 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-violet-500 bg-violet-50"
                            : "border-slate-200 bg-white hover:border-violet-300"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                            isSelected ? "bg-violet-100" : "bg-slate-100"
                          }`}
                        >
                          <Icon
                            className={`w-6 h-6 ${isSelected ? "text-violet-600" : "text-slate-600"}`}
                          />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {type.name}
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                          {type.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Sparkles className="w-3 h-3" />
                          <span>~{type.estimatedTime} with AI</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Template Mode - Template Browser */}
            {creationMode === "template" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
                      {templateSearch ? "No templates found" : "No templates yet"}
                    </h3>
                    <p className="text-slate-500 mb-4 max-w-md mx-auto">
                      {templateSearch
                        ? "Try a different search term or create a new contract with AI."
                        : "Create contracts and save them as templates to reuse later."}
                    </p>
                    <button
                      onClick={() => setCreationMode("smart")}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
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
                              : "border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSystem ? "bg-emerald-100" : "bg-violet-100"
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isSystem ? "text-emerald-600" : "text-violet-600"
                              }`} />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {isSystem && (
                                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  Pre-built
                                </span>
                              )}
                              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
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
                                  : "text-violet-600 bg-violet-50 hover:bg-violet-100"
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
                      href="/templates"
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium"
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
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:border-violet-300"
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
            {/* Smart Templates Banner */}
            <SmartTemplatesBanner />

            <ContractDetailsForm
              contractType={selectedType}
              jurisdiction={jurisdiction}
              formData={formData}
              onChange={setFormData}
            />

            {/* Payment Settings Section - Only for service/work contracts */}
            {selectedType && !["nda_mutual", "nda_one_way", "safe_note"].includes(selectedType) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Payment Collection</h3>
                  <p className="text-sm text-slate-500">Optionally require payment with this contract</p>
                </div>
              </div>

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
                        onChange={(e) => setPaymentCurrency(e.target.value)}
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
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Payment Split
                      </label>
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
                        <p className="text-sm text-slate-500">Enter Total Amount and Deposit in project details above</p>
                      )}
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">How Payment Works</p>
                      <p className="mt-1">
                        {paymentStructure === "full" && `The signer will pay ${derivedPaymentAmount > 0 ? `$${derivedPaymentAmount.toLocaleString()}` : 'the full amount'} when signing the contract. You'll receive funds via Stripe.`}
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

        {/* Step 3: Review & Generate */}
        {step === 3 && selectedType && (
          <div className="space-y-6">
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
                    {CONTRACT_TYPES[selectedType].name}
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
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-violet-600" />
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
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons - Hide on step 1 in template/smart mode */}
        {!(step === 1 && (creationMode === "template" || creationMode === "smart")) && (
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

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && !selectedType}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  step === 1 && !selectedType
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50"
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
        <TemplatePlaceholderModal
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
}: {
  contractType: ContractType;
  jurisdiction: Jurisdiction;
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...formData, [field]: value });
  };

  const updateNestedField = (parent: string, field: string, value: unknown) => {
    const current = (formData[parent] as Record<string, unknown>) || {};
    onChange({ ...formData, [parent]: { ...current, [field]: value } });
  };

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
        />
      );

    case "independent_contractor":
      return (
        <ContractorForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
        />
      );

    case "consulting_agreement":
      return (
        <ConsultingForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
        />
      );

    case "safe_note":
      return (
        <SAFEForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
        />
      );

    case "freelance_service":
      return (
        <FreelanceForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          onChange={onChange}
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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
  isMutual: boolean;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups: SignerGroup[] = (formData.signerGroups as SignerGroup[]) || createSignerGroups([
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
    // Combine all updates into a single onChange call to avoid state race conditions
    const disclosing = groups.find(g => g.role === "disclosingParty");
    const receiving = groups.find(g => g.role === "receivingParty");

    const updates: Record<string, unknown> = {
      ...formData,
      signerGroups: groups,
    };

    if (disclosing?.signers[0]) {
      updates.disclosingParty = {
        name: disclosing.signers[0].name,
        email: disclosing.signers[0].email,
        company: disclosing.signers[0].title || "",
      };
    }
    if (receiving?.signers[0]) {
      updates.receivingParty = {
        name: receiving.signers[0].name,
        email: receiving.signers[0].email,
        company: receiving.signers[0].title || "",
      };
    }

    onChange(updates);
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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups: SignerGroup[] = (formData.signerGroups as SignerGroup[]) || createSignerGroups([
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
    // Combine all updates into a single onChange call to avoid state race conditions
    const clientGroup = groups.find(g => g.role === "client");
    const contractorGroup = groups.find(g => g.role === "contractor");

    const updates: Record<string, unknown> = {
      ...formData,
      signerGroups: groups,
    };

    if (clientGroup?.signers[0]) {
      updates.client = {
        name: clientGroup.signers[0].name,
        email: clientGroup.signers[0].email,
      };
    }
    if (contractorGroup?.signers[0]) {
      updates.contractor = {
        name: contractorGroup.signers[0].name,
        email: contractorGroup.signers[0].email,
      };
    }

    onChange(updates);
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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups: SignerGroup[] = (formData.signerGroups as SignerGroup[]) || createSignerGroups([
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
    // Combine all updates into a single onChange call to avoid state race conditions
    const clientGroup = groups.find(g => g.role === "client");
    const consultantGroup = groups.find(g => g.role === "consultant");

    const updates: Record<string, unknown> = {
      ...formData,
      signerGroups: groups,
    };

    if (clientGroup?.signers[0]) {
      updates.client = {
        name: clientGroup.signers[0].name,
        email: clientGroup.signers[0].email,
      };
    }
    if (consultantGroup?.signers[0]) {
      updates.consultant = {
        name: consultantGroup.signers[0].name,
        email: consultantGroup.signers[0].email,
      };
    }

    onChange(updates);
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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups: SignerGroup[] = (formData.signerGroups as SignerGroup[]) || createSignerGroups([
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
    // Combine all updates into a single onChange call to avoid state race conditions
    const companyGroup = groups.find(g => g.role === "company");
    const investorGroup = groups.find(g => g.role === "investor");

    const updates: Record<string, unknown> = {
      ...formData,
      signerGroups: groups,
    };

    if (companyGroup?.signers[0]) {
      updates.company = {
        name: companyGroup.signers[0].name,
        email: companyGroup.signers[0].email,
      };
    }
    if (investorGroup?.signers[0]) {
      updates.investor = {
        name: investorGroup.signers[0].name,
        email: investorGroup.signers[0].email,
      };
    }

    onChange(updates);
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

function FreelanceForm({
  formData,
  updateField,
  updateNestedField,
  onChange,
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  onChange: (data: Record<string, unknown>) => void;
}) {
  // Initialize signer groups from form data or create defaults
  const signerGroups: SignerGroup[] = (formData.signerGroups as SignerGroup[]) || createSignerGroups([
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
    // Combine all updates into a single onChange call to avoid state race conditions
    const clientGroup = groups.find(g => g.role === "client");
    const freelancerGroup = groups.find(g => g.role === "freelancer");

    const updates: Record<string, unknown> = {
      ...formData,
      signerGroups: groups,
    };

    if (clientGroup?.signers[0]) {
      updates.client = {
        name: clientGroup.signers[0].name,
        email: clientGroup.signers[0].email,
      };
    }
    if (freelancerGroup?.signers[0]) {
      updates.freelancer = {
        name: freelancerGroup.signers[0].name,
        email: freelancerGroup.signers[0].email,
      };
    }

    onChange(updates);
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
          />
          <FormTextarea
            label="Project Description"
            value={(formData.projectDescription as string) || ""}
            onChange={(v) => updateField("projectDescription", v)}
            placeholder="Describe the project scope and deliverables..."
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
                  className={`flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                    formData.revisionRounds === -1 ? "bg-slate-100 text-slate-400" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => updateField("revisionRounds", formData.revisionRounds === -1 ? 2 : -1)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    formData.revisionRounds === -1
                      ? "bg-violet-100 border-violet-300 text-violet-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-violet-300"
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
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Smart Auto-Fill</h3>
            <p className="text-sm text-slate-600 mt-1">
              Start typing to see suggestions from your frequently used contacts.
              We learn from your past contracts to speed up your workflow.
            </p>
            {syncResult && (
              <p className="text-xs text-violet-600 mt-2">
                Synced {syncResult.created} new + {syncResult.updated} updated contacts
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-700 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync Contacts"}</span>
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
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
      />
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
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
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
        className="mt-1 w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
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

function buildMetadata(
  contractType: ContractType,
  jurisdiction: Jurisdiction,
  formData: Record<string, unknown>
): Record<string, unknown> {
  const today = new Date().toISOString().split("T")[0];

  // Get signer groups if present (for multi-signatory support)
  const signerGroups = formData.signerGroups as SignerGroup[] | undefined;

  // Base metadata with defaults
  const base = {
    contractType,
    jurisdiction,
    effectiveDate: (formData.effectiveDate as string) || today,
    // Include signerGroups for the generation API to use
    signerGroups: signerGroups || undefined,
  };

  switch (contractType) {
    case "nda_mutual":
    case "nda_one_way":
      return {
        ...base,
        disclosingParty: {
          name: (formData.disclosingParty as Record<string, string>)?.name || "Party A",
          email: (formData.disclosingParty as Record<string, string>)?.email || "party.a@example.com",
          company: (formData.disclosingParty as Record<string, string>)?.company || "",
          role: "discloser",
        },
        receivingParty: {
          name: (formData.receivingParty as Record<string, string>)?.name || "Party B",
          email: (formData.receivingParty as Record<string, string>)?.email || "party.b@example.com",
          company: (formData.receivingParty as Record<string, string>)?.company || "",
          role: "recipient",
        },
        purpose: (formData.purpose as string) || "To discuss potential business collaboration",
        confidentialityPeriod: (formData.confidentialityPeriod as number) || 2,
        includeNonSolicit: (formData.includeNonSolicit as boolean) || false,
        includeNonCompete: (formData.includeNonCompete as boolean) || false,
        nonCompetePeriod: (formData.nonCompetePeriod as number) || 12,
      };

    case "independent_contractor":
      return {
        ...base,
        client: {
          name: (formData.client as Record<string, string>)?.name || "Client Co",
          email: (formData.client as Record<string, string>)?.email || "client@example.com",
          role: "client",
        },
        contractor: {
          name: (formData.contractor as Record<string, string>)?.name || "Contractor",
          email: (formData.contractor as Record<string, string>)?.email || "contractor@example.com",
          role: "contractor",
        },
        servicesDescription: (formData.servicesDescription as string) || "Professional services as agreed",
        paymentAmount: (formData.paymentAmount as number) || 5000,
        paymentFrequency: (formData.paymentFrequency as string) || "monthly",
        paymentTerms: (formData.paymentTerms as number) || 30,
        terminationNoticeDays: 14,
        includeIPAssignment: true,
        includeConfidentiality: true,
      };

    case "consulting_agreement":
      return {
        ...base,
        client: {
          name: (formData.client as Record<string, string>)?.name || "Client Co",
          email: (formData.client as Record<string, string>)?.email || "client@example.com",
          role: "client",
        },
        consultant: {
          name: (formData.consultant as Record<string, string>)?.name || "Consultant",
          email: (formData.consultant as Record<string, string>)?.email || "consultant@example.com",
          role: "consultant",
        },
        consultingScope: (formData.consultingScope as string) || "Strategic consulting services",
        hourlyRate: (formData.hourlyRate as number) || undefined,
        retainerAmount: (formData.retainerAmount as number) || undefined,
        paymentTerms: 30,
        includeIPAssignment: true,
        includeConfidentiality: true,
        includeNonCompete: false,
      };

    case "safe_note":
      return {
        ...base,
        company: {
          name: (formData.company as Record<string, string>)?.name || "Startup Inc",
          email: (formData.company as Record<string, string>)?.email || "founders@startup.com",
          role: "company",
        },
        investor: {
          name: (formData.investor as Record<string, string>)?.name || "Angel Investor",
          email: (formData.investor as Record<string, string>)?.email || "investor@example.com",
          role: "investor",
        },
        investmentAmount: (formData.investmentAmount as number) || 50000,
        safeType: (formData.safeType as string) || "valuation_cap",
        valuationCap: (formData.valuationCap as number) || undefined,
        discountRate: (formData.discountRate as number) || undefined,
        proRataRights: (formData.proRataRights as boolean) || false,
      };

    case "freelance_service":
      return {
        ...base,
        client: {
          name: (formData.client as Record<string, string>)?.name || "Client",
          email: (formData.client as Record<string, string>)?.email || "client@example.com",
          role: "client",
        },
        freelancer: {
          name: (formData.freelancer as Record<string, string>)?.name || "Freelancer",
          email: (formData.freelancer as Record<string, string>)?.email || "freelancer@example.com",
          role: "contractor",
        },
        projectName: (formData.projectName as string) || "Project",
        projectDescription: (formData.projectDescription as string) || "Freelance project work",
        totalAmount: (formData.totalAmount as number) || 1000,
        depositAmount: (formData.depositAmount as number) || undefined,
        paymentSchedule: "milestone",
        revisionRounds: (formData.revisionRounds as number) === -1 ? "unlimited" : ((formData.revisionRounds as number) || 2),
        deliverables: [
          {
            description: (formData.projectDescription as string) || "Project deliverable",
          },
        ],
        includeIPAssignment: true,
      };

    default:
      return base;
  }
}

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

// ============================================================================
// Template Placeholder Modal
// ============================================================================

interface TemplatePlaceholderModalProps {
  template: Template & { content?: { placeholders?: Placeholder[] } };
  placeholderValues: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

function TemplatePlaceholderModal({
  template,
  placeholderValues,
  onValuesChange,
  onSubmit,
  onClose,
  isSubmitting,
}: TemplatePlaceholderModalProps) {
  const placeholders = template.content?.placeholders || [];

  // Group placeholders by category
  const groupedPlaceholders = placeholders.reduce((acc, p) => {
    const category = p.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(p);
    return acc;
  }, {} as Record<string, Placeholder[]>);

  // Category display names
  const categoryNames: Record<string, string> = {
    party_a: "Your Information",
    party_b: "Other Party",
    dates: "Important Dates",
    terms: "Agreement Terms",
    other: "Other Details",
  };

  // Category order
  const categoryOrder = ["party_a", "party_b", "dates", "terms", "other"];

  // Get ordered categories
  const orderedCategories = categoryOrder.filter(c => groupedPlaceholders[c]?.length);

  // Count required fields
  const requiredFields = placeholders.filter(p => p.required);
  const filledRequired = requiredFields.filter(p => placeholderValues[p.id]?.trim());

  const updateValue = (id: string, value: string) => {
    onValuesChange({ ...placeholderValues, [id]: value });
  };

  const canSubmit = requiredFields.every(p => placeholderValues[p.id]?.trim());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Fill in Contract Details
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                {template.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {filledRequired.length} of {requiredFields.length} required fields completed
              </span>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${requiredFields.length ? (filledRequired.length / requiredFields.length) * 100 : 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-220px)]">
            <div className="space-y-8">
              {orderedCategories.map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    {categoryNames[category] || category}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {groupedPlaceholders[category].map((placeholder) => (
                      <div key={placeholder.id} className={placeholder.type === "textarea" ? "md:col-span-2" : ""}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {placeholder.label}
                          {placeholder.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {placeholder.description && (
                          <p className="text-xs text-slate-500 mb-1.5">
                            {placeholder.description}
                          </p>
                        )}
                        {placeholder.type === "textarea" ? (
                          <textarea
                            value={placeholderValues[placeholder.id] || ""}
                            onChange={(e) => updateValue(placeholder.id, e.target.value)}
                            placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                          />
                        ) : (
                          <input
                            type={placeholder.type === "number" ? "number" : placeholder.type === "date" ? "date" : placeholder.type === "email" ? "email" : "text"}
                            value={placeholderValues[placeholder.id] || ""}
                            onChange={(e) => updateValue(placeholder.id, e.target.value)}
                            placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Contract
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
