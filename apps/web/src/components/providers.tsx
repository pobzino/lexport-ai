"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { OnboardingProvider } from "@/components/onboarding";
import { PostHogProvider } from "@/components/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <OnboardingProvider>
            <ToastProvider>{children}</ToastProvider>
          </OnboardingProvider>
        </Suspense>
      </QueryClientProvider>
    </PostHogProvider>
  );
}

