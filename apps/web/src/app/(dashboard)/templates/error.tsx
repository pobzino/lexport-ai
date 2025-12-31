"use client";

import { DashboardError } from "@/components/errors";

export default function TemplatesPageError({
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
      title="Failed to load templates"
      description="We couldn't load your templates. Please try again."
    />
  );
}
