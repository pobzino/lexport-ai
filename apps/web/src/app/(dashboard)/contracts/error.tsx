"use client";

import { DashboardError } from "@/components/errors";

export default function ContractsPageError({
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
      title="Failed to load contracts"
      description="We couldn't load your contracts. Please check your connection and try again."
    />
  );
}
