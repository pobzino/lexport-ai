"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Users, Building2, Sparkles, ArrowRight } from "lucide-react";
import { useOnboarding, type UserType } from "./onboarding-context";

const USER_TYPES = [
  {
    id: "startup_founder" as UserType,
    label: "Startup Founder",
    description: "Building a company, hiring contractors, raising funds",
    icon: Briefcase,
    examples: [
      "NDA for investor meetings",
      "Contractor agreements",
      "SAFE notes for fundraising",
    ],
  },
  {
    id: "freelancer" as UserType,
    label: "Freelancer / Consultant",
    description: "Working with clients, delivering projects",
    icon: Users,
    examples: [
      "Service agreements",
      "Project contracts",
      "NDAs for clients",
    ],
  },
  {
    id: "agency" as UserType,
    label: "Agency Owner",
    description: "Managing multiple clients and contractors",
    icon: Building2,
    examples: [
      "Master service agreements",
      "Statements of work",
      "Subcontractor agreements",
    ],
  },
];

export function WelcomeModal() {
  const { showWelcome, setUserType } = useOnboarding();
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [step, setStep] = useState<"select" | "examples">("select");
  const router = useRouter();

  if (!showWelcome) return null;

  const handleContinue = () => {
    if (selectedType) {
      setUserType(selectedType);
      router.push("/contracts/new");
    }
  };

  const selectedTypeData = USER_TYPES.find(t => t.id === selectedType);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Lexport!</h1>
          <p className="text-violet-100 mt-2">
            {step === "select"
              ? "Let's personalize your experience"
              : "Here's what you can create"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "select" ? (
            <>
              <p className="text-slate-600 text-center mb-6">
                What best describes you?
              </p>

              <div className="space-y-3">
                {USER_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;

                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-violet-500 bg-violet-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-violet-100" : "bg-slate-100"
                      }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? "text-violet-600" : "text-slate-600"}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isSelected ? "text-violet-900" : "text-slate-900"}`}>
                          {type.label}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => selectedType && setStep("examples")}
                disabled={!selectedType}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-slate-400 text-center mt-4">
                You can change this later in settings
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-slate-600">
                  Popular contracts for <span className="font-medium text-violet-600">{selectedTypeData?.label}</span>:
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {selectedTypeData?.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                      <span className="text-violet-600 font-semibold text-sm">{idx + 1}</span>
                    </div>
                    <span className="text-slate-700">{example}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600 text-center">
                  <Sparkles className="w-4 h-4 inline-block mr-1 text-violet-500" />
                  Just describe what you need in plain English - our AI handles the rest
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("select")}
                  className="px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Create My First Contract
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
