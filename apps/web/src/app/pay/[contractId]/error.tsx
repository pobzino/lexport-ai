"use client";

import { PublicError } from "@/components/errors";

export default function PayPageError({
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
      variant="pay"
      title="Unable to load payment"
      description="We couldn't load the payment page. Please try refreshing or contact the sender for assistance. If the issue persists, the payment link may have expired."
    />
  );
}
