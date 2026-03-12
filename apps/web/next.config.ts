import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const localSupabaseConnectSources: string[] = [];

if (!isProduction) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      localSupabaseConnectSources.push(parsed.origin);
      localSupabaseConnectSources.push(
        parsed.protocol === "https:" ? `wss://${parsed.host}` : `ws://${parsed.host}`
      );
    } catch {
      // Keep defaults if NEXT_PUBLIC_SUPABASE_URL is malformed.
    }
  }
}

// Content Security Policy
// Note: 'unsafe-inline' for styles is required by Next.js and Tailwind
// 'unsafe-eval' is only needed in development for hot reload
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://js.stripe.com https://connect-js.stripe.com https://app.posthog.com https://*.sentry.io ${isDevelopment ? "'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https: http:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://connect.stripe.com https://connect-js.stripe.com https://merchant-ui-api.stripe.com https://m.stripe.network https://api.openai.com https://app.posthog.com https://us.i.posthog.com https://*.sentry.io ${localSupabaseConnectSources.join(" ")};
  frame-src 'self' blob: https://*.supabase.co https://js.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://hooks.stripe.com ${localSupabaseConnectSources[0] ?? ""};
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  ${isProduction ? "upgrade-insecure-requests;" : ""}
`.replace(/\n/g, " ").trim();

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Ensure Next uses the repo root (not parent home dir) for tracing/watch context.
  outputFileTracingRoot: path.join(process.cwd(), "../.."),

  // Keep recently visited routes warm in dev to avoid frequent recompiles
  // while navigating around the dashboard.
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1 hour
    pagesBufferLength: 50,
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth avatars
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub avatars
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Turbopack is the default bundler in Next.js 16.  An empty config
  // silences the "webpack config present but no turbopack config" error.
  turbopack: {},

  webpack: (config) => {
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push(/Invalid source map/);
    return config;
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

// Wrap with Sentry only if DSN is configured
const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: false,
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
