function normalizeOrigin(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function getAuthCallbackUrl(nextPath?: string): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const runtimeOrigin =
    typeof window !== "undefined" ? normalizeOrigin(window.location.origin) : null;

  let baseOrigin = runtimeOrigin || configuredOrigin || "http://localhost:3000";

  // Prefer configured localhost URL in development so callback URLs stay
  // consistent with Supabase allow-list configuration.
  if (configuredOrigin && runtimeOrigin && process.env.NODE_ENV === "development") {
    const configuredUrl = new URL(configuredOrigin);
    const runtimeUrl = new URL(runtimeOrigin);
    const configuredHost = configuredUrl.hostname;
    const runtimeHost = runtimeUrl.hostname;

    // Only lock to the configured origin if both localhost origins use
    // the same port; otherwise keep the runtime origin to avoid redirecting
    // auth callbacks to a port that isn't running locally.
    const configuredPort = configuredUrl.port || (configuredUrl.protocol === "https:" ? "443" : "80");
    const runtimePort = runtimeUrl.port || (runtimeUrl.protocol === "https:" ? "443" : "80");
    if (isLocalhost(configuredHost) && isLocalhost(runtimeHost) && configuredPort === runtimePort) {
      baseOrigin = configuredOrigin;
    }
  }

  const callbackUrl = new URL("/auth/callback", baseOrigin);
  if (nextPath) {
    callbackUrl.searchParams.set("next", nextPath);
  }
  return callbackUrl.toString();
}
