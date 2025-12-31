"use client";

import { PublicError } from "@/components/errors";

export default function ReviewPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicError
      error={error}
      reset={reset}
      variant="generic"
      title="Unable to load review page"
      description="We couldn't load the document for review. The review link may have expired, or there might be a temporary issue. Please try refreshing or contact the sender for a new link."
    />
  );
}
