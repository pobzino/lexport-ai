"use client";

import { DashboardError } from "@/components/errors";

export default function SignaturesPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardError
      error={error}
      reset={reset}
      title="Failed to load signatures"
      description="We couldn't load your signature requests. Please try again."
    />
  );
}
