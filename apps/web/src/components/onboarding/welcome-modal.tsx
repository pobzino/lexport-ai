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
        {/* Header */}
        <div className="bg-[#202e46] px-6 py-8 text-white text-center">

          <h1 className="text-2xl font-bold">Welcome to Lexport</h1>
          <p className="text-slate-300 mt-2">
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
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                        ? "border-[#529ec6] bg-[#529ec6]/5"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#529ec6]/10" : "bg-slate-100"
                        }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? "text-[#529ec6]" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isSelected ? "text-[#202e46]" : "text-slate-900"}`}>
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
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-[#529ec6] text-white hover:bg-[#4189b1] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/10"
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
                  Popular contracts for <span className="font-medium text-[#529ec6]">{selectedTypeData?.label}</span>:
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {selectedTypeData?.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="w-8 h-8 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
                      <span className="text-[#529ec6] font-semibold text-sm">{idx + 1}</span>
                    </div>
                    <span className="text-slate-700">{example}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#529ec6]/5 rounded-xl p-4 mb-6 border border-[#529ec6]/10">
                <p className="text-sm text-slate-600 text-center">
                  <Sparkles className="w-4 h-4 inline-block mr-1 text-[#529ec6]" />
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
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-[#529ec6] text-white hover:bg-[#4189b1] transition-all shadow-lg shadow-blue-900/10"
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
