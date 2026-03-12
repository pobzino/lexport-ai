"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Edit,
  Sparkles,
  Loader2,
  FileStack,
  Play,
  ArrowRight,
  X,
  Search,
  Star,
  Clock,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CONTRACT_TYPES,
  JURISDICTION_NAMES,
  type ContractType,
  type Jurisdiction,
} from "@/lib/contracts/schemas";
import type { Template } from "@/db/types";

// Icon mapping
const CONTRACT_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  briefcase: Briefcase,
  users: Users,
  "trending-up": TrendingUp,
  edit: Edit,
};

// Popular templates for quick start
const QUICK_START_TEMPLATES = [
  {
    type: "nda_mutual" as ContractType,
    title: "Mutual NDA",
    description: "Share confidential info with a partner, vendor, or investor",
    popular: true,
    time: "2 min",
  },
  {
    type: "freelance_service" as ContractType,
    title: "Freelance Agreement",
    description: "Hire a freelancer for a specific project with clear terms",
    popular: true,
    time: "3 min",
  },
  {
    type: "independent_contractor" as ContractType,
    title: "Contractor Agreement",
    description: "Engage an independent contractor for ongoing work",
    popular: false,
    time: "3 min",
  },
  {
    type: "consulting_agreement" as ContractType,
    title: "Consulting Agreement",
    description: "Bring on a consultant for advisory services",
    popular: false,
    time: "3 min",
  },
];

interface ContractTypeStepProps {
  selectedType: ContractType | null;
  onTypeSelect: (type: ContractType) => void;
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (jurisdiction: Jurisdiction) => void;
  onSmartIntakeComplete?: (analysis: IntakeAnalysis, matchingTemplate?: MatchingTemplate) => void;
  onTemplateSelect?: (templateId: string) => void;
  onContinue: () => void;
}

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

interface MatchingTemplate {
  id: string;
  title: string;
  contractType: string;
  jurisdiction: string;
  placeholders: string[];
  autoFilledValues: Record<string, string>;
  filledCount: number;
  totalCount: number;
}

type CreationMode = "smart" | "manual" | "template";

export function ContractTypeStep({
  selectedType,
  onTypeSelect,
  jurisdiction,
  onJurisdictionChange,
  onSmartIntakeComplete,
  onTemplateSelect,
  onContinue,
}: ContractTypeStepProps) {
  const [creationMode, setCreationMode] = useState<CreationMode>("smart");
  const [intakeDescription, setIntakeDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intakeAnalysis, setIntakeAnalysis] = useState<IntakeAnalysis | null>(null);
  const [matchingTemplate, setMatchingTemplate] = useState<MatchingTemplate | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Template browser state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateJurisdiction, setTemplateJurisdiction] = useState<string>("");

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

      if (data.matchingTemplate) {
        setMatchingTemplate(data.matchingTemplate);
      }

      onTypeSelect(data.analysis.suggestedType as ContractType);
      if (data.analysis.jurisdiction) {
        onJurisdictionChange(data.analysis.jurisdiction as Jurisdiction);
      }

      if (onSmartIntakeComplete) {
        onSmartIntakeComplete(data.analysis, data.matchingTemplate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetIntake = () => {
    setIntakeAnalysis(null);
    setMatchingTemplate(null);
    setFollowUpAnswers({});
  };

  // Fetch templates
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

  return (
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
            onClick={() => {
              setCreationMode("smart");
              handleResetIntake();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              creationMode === "smart"
                ? "bg-[#529ec6]/10 text-[#202e46]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Describe Need
          </button>
          <button
            onClick={() => {
              setCreationMode("manual");
              handleResetIntake();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              creationMode === "manual"
                ? "bg-[#529ec6]/10 text-[#202e46]"
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
                ? "bg-[#529ec6]/10 text-[#202e46]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileStack className="w-4 h-4" />
            Use Template
          </button>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
              <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Intake Mode */}
      {creationMode === "smart" && !intakeAnalysis && (
        <SmartIntakeForm
          description={intakeDescription}
          onDescriptionChange={setIntakeDescription}
          onAnalyze={handleAnalyzeIntake}
          isAnalyzing={isAnalyzing}
        />
      )}

      {/* Smart Intake Result */}
      {creationMode === "smart" && intakeAnalysis && (
        <SmartIntakeResult
          analysis={intakeAnalysis}
          matchingTemplate={matchingTemplate}
          jurisdiction={jurisdiction}
          onJurisdictionChange={onJurisdictionChange}
          followUpAnswers={followUpAnswers}
          onFollowUpAnswersChange={setFollowUpAnswers}
          onReset={handleResetIntake}
          onUseTemplate={() => matchingTemplate && onTemplateSelect?.(matchingTemplate.id)}
          onContinue={onContinue}
        />
      )}

      {/* Manual Mode - Quick Start + All Types */}
      {creationMode === "manual" && (
        <ManualSelection
          selectedType={selectedType}
          onTypeSelect={onTypeSelect}
          jurisdiction={jurisdiction}
          onJurisdictionChange={onJurisdictionChange}
        />
      )}

      {/* Template Mode */}
      {creationMode === "template" && (
        <TemplateBrowser
          templates={templates}
          loading={templatesLoading}
          search={templateSearch}
          onSearchChange={setTemplateSearch}
          jurisdiction={templateJurisdiction}
          onJurisdictionChange={setTemplateJurisdiction}
          onTemplateSelect={(template) => onTemplateSelect?.(template.id)}
          onSwitchToSmart={() => setCreationMode("smart")}
        />
      )}
    </div>
  );
}

// Smart Intake Form Sub-component
function SmartIntakeForm({
  description,
  onDescriptionChange,
  onAnalyze,
  isAnalyzing,
}: {
  description: string;
  onDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}) {
  const examples = [
    "I need an NDA to share confidential business plans with a potential investor",
    "Hiring a contractor to build a mobile app for $25,000 over 4 months",
    "Need a consulting agreement for advisory services at $200/hour",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#529ec6]/10 to-[#529ec6]/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-[#529ec6]" />
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
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Example: I'm hiring a freelance designer in California for a 3-month project to redesign our company website. The total budget is $15,000 with a 30% deposit upfront..."
          rows={5}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] resize-none text-slate-900 placeholder:text-slate-400"
          disabled={isAnalyzing}
        />

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            {description.length} characters
            {description.length < 10 && description.length > 0 && (
              <span className="text-amber-600 ml-2">(minimum 10)</span>
            )}
          </p>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || description.length < 10}
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
      </div>

      {/* Example prompts */}
      <div className="mt-6">
        <p className="text-sm text-slate-500 mb-3 text-center">Or try an example:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {examples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => onDescriptionChange(example)}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            >
              {example.length > 50 ? example.substring(0, 50) + "..." : example}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Smart Intake Result Sub-component
function SmartIntakeResult({
  analysis,
  matchingTemplate,
  jurisdiction,
  onJurisdictionChange,
  followUpAnswers,
  onFollowUpAnswersChange,
  onReset,
  onUseTemplate,
  onContinue,
}: {
  analysis: IntakeAnalysis;
  matchingTemplate: MatchingTemplate | null;
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (jurisdiction: Jurisdiction) => void;
  followUpAnswers: Record<string, string>;
  onFollowUpAnswersChange: (answers: Record<string, string>) => void;
  onReset: () => void;
  onUseTemplate: () => void;
  onContinue: () => void;
}) {
  const Icon = CONTRACT_ICONS[analysis.contractTypeIcon] || Shield;

  const formatFieldLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="bg-white rounded-xl border-2 border-[#529ec6]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-[#529ec6]" />
            </div>
            <div>
              <p className="text-sm text-[#529ec6] font-medium">Recommended Contract</p>
              <h3 className="text-xl font-bold text-slate-900">{analysis.contractTypeName}</h3>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.confidence >= 80
                ? "bg-emerald-100 text-emerald-700"
                : analysis.confidence >= 60
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {analysis.confidence}% match
          </div>
        </div>

        <p className="text-slate-600 mb-4">{analysis.contractTypeDescription}</p>

        {/* Jurisdiction */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span className="font-medium">Jurisdiction:</span>
          <select
            value={jurisdiction}
            onChange={(e) => onJurisdictionChange(e.target.value as Jurisdiction)}
            className="px-2 py-1 border border-slate-200 rounded text-slate-700 bg-white"
          >
            {analysis.availableJurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        {/* Matching Template */}
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
                  We have a pre-built template that matches your needs. Use it for instant generation
                  with no AI cost.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={onUseTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Use Template (Instant)
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
        {Object.keys(analysis.extractedFields).length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Details I found:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(analysis.extractedFields).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-slate-500">{formatFieldLabel(key)}:</span>
                  <span className="text-slate-900 font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Questions */}
        {analysis.followUpQuestions.length > 0 && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">A few quick questions:</p>
            <div className="space-y-3">
              {analysis.followUpQuestions.map((q) => (
                <div key={q.field}>
                  <label className="block text-sm text-slate-600 mb-1">
                    {q.question}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {q.type === "select" && q.options ? (
                    <select
                      value={followUpAnswers[q.field] || ""}
                      onChange={(e) =>
                        onFollowUpAnswersChange({ ...followUpAnswers, [q.field]: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] bg-white"
                    >
                      <option value="">Select...</option>
                      {q.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
                      value={followUpAnswers[q.field] || ""}
                      onChange={(e) =>
                        onFollowUpAnswersChange({ ...followUpAnswers, [q.field]: e.target.value })
                      }
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
          <button onClick={onReset} className="text-sm text-slate-500 hover:text-slate-700">
            Start over
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-[#202e46] text-white hover:bg-[#1a2539] transition-colors"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Manual Selection Sub-component
function ManualSelection({
  selectedType,
  onTypeSelect,
  jurisdiction,
  onJurisdictionChange,
}: {
  selectedType: ContractType | null;
  onTypeSelect: (type: ContractType) => void;
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (jurisdiction: Jurisdiction) => void;
}) {
  return (
    <>
      {/* Quick Start Cards */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4" />
          Quick Start - Popular Contracts
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_START_TEMPLATES.map((template) => {
            const Icon = CONTRACT_ICONS[CONTRACT_TYPES[template.type].icon] || Shield;
            const isSelected = selectedType === template.type;

            return (
              <motion.button
                key={template.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onTypeSelect(template.type)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-[#529ec6] bg-[#529ec6]/5 shadow-md"
                    : "border-slate-200 bg-white hover:border-[#529ec6]/30 hover:shadow-sm"
                }`}
              >
                {template.popular && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    Popular
                  </span>
                )}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    isSelected ? "bg-[#529ec6]/10" : "bg-slate-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? "text-[#529ec6]" : "text-slate-600"}`} />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{template.title}</h4>
                <p className="text-xs text-slate-500 mb-2 line-clamp-2">{template.description}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{template.time}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* All Contract Types */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-4">All Contract Types</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(CONTRACT_TYPES).map((type) => {
            const Icon = CONTRACT_ICONS[type.icon] || Shield;
            const isSelected = selectedType === type.id;

            return (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onTypeSelect(type.id)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-[#529ec6] bg-[#529ec6]/5"
                    : "border-slate-200 bg-white hover:border-[#529ec6]/30"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    isSelected ? "bg-[#529ec6]/10" : "bg-slate-100"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? "text-[#529ec6]" : "text-slate-600"}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
                <p className="text-sm text-slate-600 mb-3">{type.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="w-3 h-3" />
                  <span>~{type.estimatedTime} with AI</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Jurisdiction Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-8">
        <h3 className="font-semibold text-slate-900 mb-4">Jurisdiction</h3>
        <p className="text-sm text-slate-600 mb-4">
          Select the jurisdiction where this contract will be enforced. This affects the legal
          language and clauses.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(JURISDICTION_NAMES) as [Jurisdiction, string][]).map(([key, name]) => {
            if (selectedType === "safe_note" && key === "uk") return null;

            return (
              <button
                key={key}
                onClick={() => onJurisdictionChange(key)}
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
    </>
  );
}

// Template Browser Sub-component
function TemplateBrowser({
  templates,
  loading,
  search,
  onSearchChange,
  jurisdiction,
  onJurisdictionChange,
  onTemplateSelect,
  onSwitchToSmart,
}: {
  templates: Template[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  jurisdiction: string;
  onJurisdictionChange: (value: string) => void;
  onTemplateSelect: (template: Template) => void;
  onSwitchToSmart: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6]"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        </div>
        <select
          value={jurisdiction}
          onChange={(e) => onJurisdictionChange(e.target.value)}
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
      {loading && (
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
      {!loading && templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileStack className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {search || jurisdiction ? "No templates found" : "No templates yet"}
          </h3>
          <p className="text-slate-500 mb-4 max-w-md mx-auto">
            {search || jurisdiction
              ? "Try adjusting your search or filter, or create a new contract with AI."
              : "Create contracts and save them as templates to reuse later."}
          </p>
          {(search || jurisdiction) && (
            <button
              onClick={() => {
                onSearchChange("");
                onJurisdictionChange("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors mr-2"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={onSwitchToSmart}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#529ec6] bg-[#529ec6]/5 rounded-lg hover:bg-[#529ec6]/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI instead
          </button>
        </div>
      )}

      {/* Template Cards */}
      {!loading && templates.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const Icon =
                CONTRACT_ICONS[template.type as keyof typeof CONTRACT_ICONS] || Shield;
              const typeName =
                CONTRACT_TYPES[template.type as ContractType]?.name || template.type;
              const jurisdictionName =
                JURISDICTION_NAMES[template.jurisdiction as Jurisdiction] || template.jurisdiction;
              const isSystem =
                "is_system" in template &&
                (template as { is_system?: boolean }).is_system === true;

              return (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.01 }}
                  className={`group bg-white border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${
                    isSystem
                      ? "border-emerald-200 hover:border-emerald-300"
                      : "border-slate-200 hover:border-[#529ec6]/30"
                  }`}
                  onClick={() => onTemplateSelect(template)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSystem ? "bg-emerald-100" : "bg-[#529ec6]/10"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isSystem ? "text-emerald-600" : "text-[#529ec6]"}`}
                      />
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
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        isSystem
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          : "text-[#529ec6] bg-[#529ec6]/5 hover:bg-[#529ec6]/10"
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      Use
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Link to full template library */}
          <div className="text-center pt-4">
            <Link
              href="/my-templates"
              className="text-sm text-[#529ec6] hover:text-[#202e46] font-medium inline-flex items-center gap-1"
            >
              Browse all templates
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
