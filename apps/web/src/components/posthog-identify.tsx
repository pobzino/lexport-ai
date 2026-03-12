"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

interface PostHogIdentifyProps {
  userId: string;
  email?: string | null;
  name?: string | null;
}

export function PostHogIdentify({ userId, email, name }: PostHogIdentifyProps) {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && userId) {
      posthog.identify(userId, {
        email: email ?? undefined,
        name: name ?? undefined,
      });
    }
  }, [posthog, userId, email, name]);

  return null;
}
