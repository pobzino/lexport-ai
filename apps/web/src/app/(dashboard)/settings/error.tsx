"use client";

import { DashboardError } from "@/components/errors";

export default function SettingsPageError({
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
      title="Failed to load settings"
      description="We couldn't load your settings. Please check your connection and try again."
    />
  );
}
