"use client";

import { DashboardError } from "@/components/errors";

export default function DashboardPageError({
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
      title="Failed to load dashboard"
      description="We couldn't load your dashboard data. This might be a temporary issue - please try again."
    />
  );
}
