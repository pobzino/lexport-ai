"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserType = "startup_founder" | "freelancer" | "agency" | null;

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
}

interface OnboardingContextType {
  // Welcome modal
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  userType: UserType;
  setUserType: (type: UserType) => void;

  // Checklist
  steps: OnboardingStep[];
  completeStep: (stepId: string) => Promise<void>;
  isStepCompleted: (stepId: string) => boolean;
  completedCount: number;
  totalCount: number;
  isOnboardingComplete: boolean;
  dismissChecklist: () => void;
  showChecklist: boolean;

  // Tooltips
  dismissedTips: string[];
  dismissTip: (tipId: string) => Promise<void>;
  isTipDismissed: (tipId: string) => boolean;

  // Loading state
  isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const DEFAULT_STEPS: Omit<OnboardingStep, "completed">[] = [
  {
    id: "first_contract",
    label: "Create your first contract",
    description: "Use AI to generate a legally-binding contract",
    href: "/contracts/new",
  },
  {
    id: "preview_contract",
    label: "Preview your contract",
    description: "Review the generated clauses and customize if needed",
  },
  {
    id: "send_signature",
    label: "Send for signature",
    description: "Get your contract signed electronically",
  },
  {
    id: "save_template",
    label: "Save a template",
    description: "Create reusable templates for future contracts",
    href: "/templates",
  },
  {
    id: "setup_payments",
    label: "Set up payment collection",
    description: "Connect Stripe to collect payments through contracts",
    href: "/settings/payments",
  },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userType, setUserTypeState] = useState<UserType>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [showChecklist, setShowChecklist] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  // Load onboarding state from database
  useEffect(() => {
    async function loadOnboardingState() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        // Get user profile for user_type and onboarding status
        const { data: profile } = await supabase
          .from("users")
          .select("user_type, onboarding_completed_at")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserTypeState(profile.user_type as UserType);

          // Show welcome if no user_type set yet
          if (!profile.user_type) {
            setShowWelcome(true);
          }

          // Hide checklist if onboarding already complete
          if (profile.onboarding_completed_at) {
            setShowChecklist(false);
          }
        } else {
          // New user - show welcome
          setShowWelcome(true);
        }

        // Get completed steps
        const { data: progress } = await supabase
          .from("onboarding_progress")
          .select("step")
          .eq("user_id", user.id);

        if (progress) {
          setCompletedSteps(new Set(progress.map(p => p.step)));
        }

        // Get dismissed tips
        const { data: tips } = await supabase
          .from("dismissed_tips")
          .select("tip_id")
          .eq("user_id", user.id);

        if (tips) {
          setDismissedTips(tips.map(t => t.tip_id));
        }
      } catch (error) {
        console.error("Error loading onboarding state:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOnboardingState();
  }, [supabase]);

  // Set user type
  const setUserType = useCallback(async (type: UserType) => {
    setUserTypeState(type);
    setShowWelcome(false);

    if (userId && type) {
      try {
        await supabase
          .from("users")
          .update({ user_type: type })
          .eq("id", userId);
      } catch (error) {
        console.error("Error saving user type:", error);
      }
    }
  }, [userId, supabase]);

  // Complete a step
  const completeStep = useCallback(async (stepId: string) => {
    if (completedSteps.has(stepId)) return;

    setCompletedSteps(prev => new Set([...prev, stepId]));

    if (userId) {
      try {
        await supabase
          .from("onboarding_progress")
          .upsert({
            user_id: userId,
            step: stepId,
            completed_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,step",
          });
      } catch (error) {
        console.error("Error saving step progress:", error);
      }
    }
  }, [userId, completedSteps, supabase]);

  // Check if step is completed
  const isStepCompleted = useCallback((stepId: string) => {
    return completedSteps.has(stepId);
  }, [completedSteps]);

  // Dismiss a tooltip
  const dismissTip = useCallback(async (tipId: string) => {
    if (dismissedTips.includes(tipId)) return;

    setDismissedTips(prev => [...prev, tipId]);

    if (userId) {
      try {
        await supabase
          .from("dismissed_tips")
          .upsert({
            user_id: userId,
            tip_id: tipId,
            dismissed_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,tip_id",
          });
      } catch (error) {
        console.error("Error dismissing tip:", error);
      }
    }
  }, [userId, dismissedTips, supabase]);

  // Check if tip is dismissed
  const isTipDismissed = useCallback((tipId: string) => {
    return dismissedTips.includes(tipId);
  }, [dismissedTips]);

  // Dismiss checklist
  const dismissChecklist = useCallback(async () => {
    setShowChecklist(false);

    if (userId) {
      try {
        await supabase
          .from("users")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", userId);
      } catch (error) {
        console.error("Error dismissing checklist:", error);
      }
    }
  }, [userId, supabase]);

  // Build steps with completion status
  const steps: OnboardingStep[] = DEFAULT_STEPS.map(step => ({
    ...step,
    completed: completedSteps.has(step.id),
  }));

  const completedCount = completedSteps.size;
  const totalCount = DEFAULT_STEPS.length;
  const isOnboardingComplete = completedCount >= 3; // Consider complete after 3 steps

  return (
    <OnboardingContext.Provider
      value={{
        showWelcome,
        setShowWelcome,
        userType,
        setUserType,
        steps,
        completeStep,
        isStepCompleted,
        completedCount,
        totalCount,
        isOnboardingComplete,
        dismissChecklist,
        showChecklist,
        dismissedTips,
        dismissTip,
        isTipDismissed,
        isLoading,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
