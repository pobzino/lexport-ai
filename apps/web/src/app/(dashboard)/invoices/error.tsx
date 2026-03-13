"use client";

import { DashboardError } from "@/components/errors";

export default function InvoicesPageError({
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
      title="Failed to load invoices"
      description="We couldn't load your invoices. Please check your connection and try again."
    />
  );
}
