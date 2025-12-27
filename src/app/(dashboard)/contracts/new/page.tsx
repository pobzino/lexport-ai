"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  CONTRACT_TYPES,
  JURISDICTION_NAMES,
  type ContractType,
  type Jurisdiction,
} from "@/lib/contracts/schemas";

// Step indicators
const STEPS = [
  { id: 1, name: "Contract Type", description: "Choose your contract" },
  { id: 2, name: "Details", description: "Enter the specifics" },
  { id: 3, name: "Review", description: "Generate with AI" },
];

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

  // Form state
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us_california");
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const handleTypeSelect = (type: ContractType) => {
    setSelectedType(type);
    setFormData({}); // Reset form data when type changes
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

      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType: selectedType,
          metadata,
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
        {/* Step 1: Choose Contract Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                What type of contract do you need?
              </h2>
              <p className="text-slate-600 mt-2">
                Select a contract type to get started. Our AI will generate a
                customized contract for you.
              </p>
            </div>

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

            {/* Jurisdiction Selection */}
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
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 2 && selectedType && (
          <ContractDetailsForm
            contractType={selectedType}
            jurisdiction={jurisdiction}
            formData={formData}
            onChange={setFormData}
          />
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
                {/* Show key details based on form data */}
                {Object.entries(formData).slice(0, 6).map(([key, value]) => (
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
            </div>

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

        {/* Navigation Buttons */}
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
      </main>
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
          isMutual={contractType === "nda_mutual"}
        />
      );

    case "independent_contractor":
      return (
        <ContractorForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
        />
      );

    case "consulting_agreement":
      return (
        <ConsultingForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
        />
      );

    case "safe_note":
      return (
        <SAFEForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
        />
      );

    case "freelance_service":
      return (
        <FreelanceForm
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
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
  isMutual,
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
  isMutual: boolean;
}) {
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Disclosing Party */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            {isMutual ? "Party A" : "Disclosing Party"}
          </h3>
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              value={(formData.disclosingParty as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("disclosingParty", "name", v)}
              placeholder="John Smith"
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.disclosingParty as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("disclosingParty", "email", v)}
              placeholder="john@company.com"
            />
            <FormInput
              label="Company (optional)"
              value={(formData.disclosingParty as Record<string, string>)?.company || ""}
              onChange={(v) => updateNestedField("disclosingParty", "company", v)}
              placeholder="Company Inc."
            />
          </div>
        </div>

        {/* Receiving Party */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            {isMutual ? "Party B" : "Receiving Party"}
          </h3>
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              value={(formData.receivingParty as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("receivingParty", "name", v)}
              placeholder="Jane Doe"
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.receivingParty as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("receivingParty", "email", v)}
              placeholder="jane@company.com"
            />
            <FormInput
              label="Company (optional)"
              value={(formData.receivingParty as Record<string, string>)?.company || ""}
              onChange={(v) => updateNestedField("receivingParty", "company", v)}
              placeholder="Company Inc."
            />
          </div>
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}

function ContractorForm({
  formData,
  updateField,
  updateNestedField,
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
}) {
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Client */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Client</h3>
          <div className="space-y-4">
            <FormInput
              label="Company/Name"
              value={(formData.client as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("client", "name", v)}
              placeholder="Acme Corp"
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.client as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("client", "email", v)}
              placeholder="contact@acme.com"
            />
          </div>
        </div>

        {/* Contractor */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Contractor</h3>
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              value={(formData.contractor as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("contractor", "name", v)}
              placeholder="Jane Contractor"
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.contractor as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("contractor", "email", v)}
              placeholder="jane@email.com"
            />
          </div>
        </div>
      </div>

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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
}) {
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

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Client</h3>
          <div className="space-y-4">
            <FormInput
              label="Company/Name"
              value={(formData.client as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("client", "name", v)}
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.client as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("client", "email", v)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Consultant</h3>
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              value={(formData.consultant as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("consultant", "name", v)}
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.consultant as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("consultant", "email", v)}
            />
          </div>
        </div>
      </div>

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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">SAFE Note Details</h2>
        <p className="text-slate-600 mt-2">
          Simple Agreement for Future Equity - Y Combinator standard.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Company</h3>
          <div className="space-y-4">
            <FormInput
              label="Company Name"
              value={(formData.company as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("company", "name", v)}
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.company as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("company", "email", v)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Investor</h3>
          <div className="space-y-4">
            <FormInput
              label="Investor Name"
              value={(formData.investor as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("investor", "name", v)}
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.investor as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("investor", "email", v)}
            />
          </div>
        </div>
      </div>

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
}: {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  updateNestedField: (parent: string, field: string, value: unknown) => void;
}) {
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

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Client</h3>
          <div className="space-y-4">
            <FormInput
              label="Name/Company"
              value={(formData.client as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("client", "name", v)}
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.client as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("client", "email", v)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Freelancer</h3>
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              value={(formData.freelancer as Record<string, string>)?.name || ""}
              onChange={(v) => updateNestedField("freelancer", "name", v)}
            />
            <FormInput
              label="Email"
              type="email"
              value={(formData.freelancer as Record<string, string>)?.email || ""}
              onChange={(v) => updateNestedField("freelancer", "email", v)}
            />
          </div>
        </div>
      </div>

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
            <FormInput
              label="Revision Rounds"
              type="number"
              value={(formData.revisionRounds as string) || "2"}
              onChange={(v) => updateField("revisionRounds", parseInt(v))}
            />
          </div>
        </div>
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

  // Base metadata with defaults
  const base = {
    contractType,
    jurisdiction,
    effectiveDate: (formData.effectiveDate as string) || today,
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
        revisionRounds: (formData.revisionRounds as number) || 2,
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
