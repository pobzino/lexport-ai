"use client";

import { PublicError } from "@/components/errors";

export default function SignPageError({
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
      variant="sign"
      title="Unable to load document"
      description="We couldn't load the document for signing. The signing link may have expired, or there might be a temporary issue. Please try refreshing or contact the sender for a new link."
    />
  );
}
