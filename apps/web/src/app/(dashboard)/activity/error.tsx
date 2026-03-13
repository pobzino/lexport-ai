"use client";

import { DashboardError } from "@/components/errors";

export default function ActivityPageError({
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
      title="Failed to load activity"
      description="We couldn't load your activity feed. Please check your connection and try again."
    />
  );
}
