"use client";

import { DashboardError } from "@/components/errors";

export default function PaymentsPageError({
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
      title="Failed to load payments"
      description="We couldn't load your payments. Please check your connection and try again."
    />
  );
}
