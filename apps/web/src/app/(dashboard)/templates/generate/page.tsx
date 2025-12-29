"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  FileText,
  Shield,
  Briefcase,
  TrendingUp,
  Globe,
  Lock,
  Eye,
} from "lucide-react";
import { CONTRACT_TYPES, JURISDICTION_NAMES } from "@/lib/contracts/schemas";
import type { ContractType, Jurisdiction } from "@/lib/contracts/schemas";
import { PlaceholderPreview } from "@/components/templates/PlaceholderEditor";

type Step = "type" | "details" | "generating" | "preview";

interface GeneratedTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  jurisdiction: string;
  content: {
    preamble: string;
    recitals: string;
    clauses: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
      order: number;
    }>;
    signatureBlock: string;
  };
}

export default function GenerateTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");

  // Form state
  const [contractType, setContractType] = useState<ContractType | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us_california");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [includeOptionalClauses, setIncludeOptionalClauses] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const contractTypeDef = contractType ? CONTRACT_TYPES[contractType] : null;

  const getContractIcon = (type: ContractType) => {
    const def = CONTRACT_TYPES[type];
    switch (def.icon) {
      case "shield":
        return <Shield className="w-5 h-5" />;
      case "briefcase":
        return <Briefcase className="w-5 h-5" />;
      case "trending-up":
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleGenerate = async () => {
    if (!contractType || !name.trim()) return;

    setStep("generating");
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType,
          jurisdiction,
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          includeOptionalClauses,
          customInstructions: customInstructions.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate template");
      }

      setGeneratedTemplate(data.template);
      setGenerationTime(data.generationTime);
      setWarnings(data.warnings || []);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate template");
      setStep("details");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/templates"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Generate Template</h1>
          <p className="text-slate-500 mt-1">
            Create a reusable contract template with AI
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { key: "type", label: "Type" },
          { key: "details", label: "Details" },
          { key: "generating", label: "Generate" },
          { key: "preview", label: "Preview" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                step === s.key
                  ? "bg-[#529ec6]/10 text-[#202e46]"
                  : ["type", "details", "generating", "preview"].indexOf(step) >
                    ["type", "details", "generating", "preview"].indexOf(s.key)
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {["type", "details", "generating", "preview"].indexOf(step) >
              ["type", "details", "generating", "preview"].indexOf(s.key) ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{i + 1}</span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < 3 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Contract Type */}
      {step === "type" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Select Contract Type
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((type) => {
                const def = CONTRACT_TYPES[type];
                const isSelected = contractType === type;

                return (
                  <button
                    key={type}
                    onClick={() => setContractType(type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-[#529ec6] bg-[#529ec6]/5"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-[#529ec6]/10 text-[#529ec6]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getContractIcon(type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{def.name}</p>
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {def.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-[#529ec6] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jurisdiction */}
          {contractType && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Select Jurisdiction
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(JURISDICTION_NAMES) as Jurisdiction[])
                  .filter((j) => contractTypeDef?.jurisdictions.includes(j))
                  .map((j) => {
                    const isSelected = jurisdiction === j;
                    return (
                      <button
                        key={j}
                        onClick={() => setJurisdiction(j)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-[#529ec6] bg-[#529ec6]/5"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Globe
                          className={`w-4 h-4 ${
                            isSelected ? "text-[#529ec6]" : "text-slate-400"
                          }`}
                        />
                        <span
                          className={
                            isSelected ? "text-[#202e46]" : "text-slate-700"
                          }
                        >
                          {JURISDICTION_NAMES[j]}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#529ec6] ml-auto" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep("details")}
              disabled={!contractType}
              className="px-6 py-2.5 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Template Details */}
      {step === "details" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Template Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g., Standard ${contractTypeDef?.name}`}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Add any specific requirements or customizations..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeOptionalClauses}
                    onChange={(e) => setIncludeOptionalClauses(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#529ec6] focus:ring-[#529ec6]"
                  />
                  <span className="text-sm text-slate-700">
                    Include optional clauses
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#529ec6] focus:ring-[#529ec6]"
                  />
                  <span className="text-sm text-slate-700 flex items-center gap-1">
                    {isPublic ? (
                      <Globe className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    Make template public
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#529ec6]/5 rounded-xl border border-[#529ec6]/20 p-6">
            <h3 className="font-semibold text-[#202e46] mb-3">
              Generation Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#529ec6]" />
                <span className="text-[#202e46]">
                  {contractTypeDef?.name} for {JURISDICTION_NAMES[jurisdiction]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#529ec6]" />
                <span className="text-[#202e46]">
                  Using GPT-5.2 with high reasoning
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#529ec6]" />
                <span className="text-[#202e46]">
                  Includes placeholder tokens for reusability
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep("type")}
              className="px-6 py-2.5 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Generate Template
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === "generating" && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#529ec6]/10 rounded-full mb-6">
            <Loader2 className="w-8 h-8 text-[#529ec6] animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Generating Your Template
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            GPT-5.2 is crafting a professional {contractTypeDef?.name} template
            with proper legal language and placeholder tokens...
          </p>
          <p className="text-sm text-slate-400 mt-4">
            This may take 15-30 seconds
          </p>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === "preview" && generatedTemplate && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="p-2 bg-green-100 rounded-full">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">
                Template Generated Successfully!
              </p>
              <p className="text-sm text-green-600">
                Generated in {((generationTime || 0) / 1000).toFixed(1)}s using GPT-5.2
              </p>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-medium text-amber-800 mb-2">Warnings:</p>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Template Preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {generatedTemplate.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {generatedTemplate.description}
                  </p>
                </div>
                <Link
                  href={`/templates/${generatedTemplate.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#529ec6] bg-[#529ec6]/5 rounded-lg hover:bg-[#529ec6]/10 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Full Template
                </Link>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              {/* Preamble */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">
                  Preamble
                </h3>
                <PlaceholderPreview
                  content={generatedTemplate.content.preamble}
                  values={{}}
                />
              </div>

              {/* Recitals */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">
                  Recitals
                </h3>
                <PlaceholderPreview
                  content={generatedTemplate.content.recitals}
                  values={{}}
                />
              </div>

              {/* Clauses */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">
                  Clauses ({generatedTemplate.content.clauses.length})
                </h3>
                <div className="space-y-4">
                  {generatedTemplate.content.clauses.slice(0, 3).map((clause) => (
                    <div
                      key={clause.id}
                      className="p-4 bg-slate-50 rounded-lg"
                    >
                      <p className="font-medium text-slate-900 mb-2">
                        {clause.title}
                      </p>
                      <div className="text-sm text-slate-600 line-clamp-3">
                        <PlaceholderPreview
                          content={clause.content}
                          values={{}}
                        />
                      </div>
                    </div>
                  ))}
                  {generatedTemplate.content.clauses.length > 3 && (
                    <p className="text-sm text-slate-500 text-center">
                      + {generatedTemplate.content.clauses.length - 3} more clauses
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => router.push("/templates")}
              className="px-6 py-2.5 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Back to Templates
            </button>
            <Link
              href={`/templates/${generatedTemplate.id}`}
              className="px-6 py-2.5 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] transition-colors"
            >
              Open Template
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
