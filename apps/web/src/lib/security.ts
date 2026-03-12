import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const localSupabaseConnectSources: string[] = [];
const localSupabaseFrameSources: string[] = [];

if (!isProduction) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
        try {
            const parsed = new URL(supabaseUrl);
            localSupabaseConnectSources.push(parsed.origin);
            localSupabaseFrameSources.push(parsed.origin);
            localSupabaseConnectSources.push(
                parsed.protocol === "https:" ? `wss://${parsed.host}` : `ws://${parsed.host}`
            );
        } catch {
            // Ignore malformed URL and keep default policy.
        }
    }
}

const contentSecurityPolicyDirectives = [
    "default-src 'self'",
    `script-src ${[
        "'self'",
        "'unsafe-inline'",
        "https://js.stripe.com",
        "https://connect-js.stripe.com",
        "https://app.posthog.com",
        "https://*.sentry.io",
        "https://unpkg.com",
        !isProduction ? "'unsafe-eval'" : null,
    ]
        .filter(Boolean)
        .join(" ")}`,
    `style-src ${[
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
    ]
        .filter(Boolean)
        .join(" ")}`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    `connect-src ${[
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.stripe.com",
        "https://connect.stripe.com",
        "https://connect-js.stripe.com",
        "https://merchant-ui-api.stripe.com",
        "https://m.stripe.network",
        "https://api.openai.com",
        "https://app.posthog.com",
        "https://us.i.posthog.com",
        "https://*.sentry.io",
        "https://unpkg.com",
        ...localSupabaseConnectSources,
    ]
        .filter(Boolean)
        .join(" ")}`,
    `frame-src ${[
        "'self'",
        "blob:",
        "https://*.supabase.co",
        "https://js.stripe.com",
        "https://connect-js.stripe.com",
        "https://connect.stripe.com",
        "https://hooks.stripe.com",
        ...localSupabaseFrameSources,
    ]
        .filter(Boolean)
        .join(" ")}`,
    "worker-src 'self' blob: https://unpkg.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
];

/**
 * Security headers for the application
 * Based on OWASP recommendations and modern best practices
 */
export const securityHeaders = {
    // Prevent clickjacking
    "X-Frame-Options": "SAMEORIGIN",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Enable XSS filter (legacy browsers)
    "X-XSS-Protection": "1; mode=block",

    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions Policy (restrict browser features)
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",

    // Content Security Policy
    "Content-Security-Policy": contentSecurityPolicyDirectives.join("; "),

    // Strict Transport Security (HTTPS) should only be sent in production.
    ...(isProduction
        ? {
              "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
          }
        : {}),
};

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

/**
 * Create rate limit key from request
 */
export function getRateLimitKey(request: Request, prefix: string = "rl"): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    return `${prefix}:${ip}`;
}

/**
 * Simple in-memory rate limiter.
 *
 * LIMITATION: On serverless platforms (Netlify Functions, Vercel, etc.),
 * this map resets on every cold start. It still provides protection during
 * warm function invocations within the same instance.
 *
 * TODO: Migrate to Upstash Redis (@upstash/ratelimit) for persistent
 * cross-instance rate limiting before scaling beyond MVP.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    maxRequests: number;  // Max requests per window
}

export function checkRateLimit(
    key: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    // Clean up old entries periodically
    if (rateLimitMap.size > 10000) {
        for (const [k, v] of rateLimitMap.entries()) {
            if (v.resetAt < now) {
                rateLimitMap.delete(k);
            }
        }
    }

    if (!record || record.resetAt < now) {
        // New window
        const newRecord = {
            count: 1,
            resetAt: now + config.windowMs,
        };
        rateLimitMap.set(key, newRecord);
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: newRecord.resetAt,
        };
    }

    // Existing window
    record.count++;

    if (record.count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: record.resetAt,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetAt: record.resetAt,
    };
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
    // Auth endpoints - stricter limits
    auth: { windowMs: 60000, maxRequests: 5 },  // 5 per minute

    // Magic link - very strict
    magicLink: { windowMs: 60000, maxRequests: 3 },  // 3 per minute

    // Sign endpoint
    sign: { windowMs: 60000, maxRequests: 10 },  // 10 per minute

    // AI endpoints - expensive operations
    ai: { windowMs: 60000, maxRequests: 10 },  // 10 per minute

    // General API
    api: { windowMs: 60000, maxRequests: 60 },  // 60 per minute
};
