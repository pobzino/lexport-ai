/**
 * Request Context Helper
 *
 * Extracts IP address, user agent, and other request information
 * from Next.js headers for audit logging.
 */

import { headers } from "next/headers";
import type { RequestContext } from "./logger";

/**
 * Extract request context from Next.js headers
 * Use this in server components and API routes
 */
export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();

  // Get IP address - check various headers used by proxies/load balancers
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const cfConnectingIp = headersList.get("cf-connecting-ip"); // Cloudflare
  const vercelForwardedFor = headersList.get("x-vercel-forwarded-for"); // Vercel

  let ipAddress: string | null = null;

  if (cfConnectingIp) {
    ipAddress = cfConnectingIp;
  } else if (vercelForwardedFor) {
    ipAddress = vercelForwardedFor.split(",")[0]?.trim() || null;
  } else if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client IP)
    ipAddress = forwardedFor.split(",")[0]?.trim() || null;
  } else if (realIp) {
    ipAddress = realIp;
  }

  // Get user agent
  const userAgent = headersList.get("user-agent");

  // Get the page URL (referer) if available
  const referer = headersList.get("referer");
  const pageUrl = referer || null;

  return {
    ipAddress,
    userAgent,
    pageUrl,
  };
}

/**
 * Extract request context from a NextRequest object
 * Use this in middleware or route handlers that have access to the request
 */
export function getRequestContextFromRequest(
  request: Request
): RequestContext {
  const headers = request.headers;

  // Get IP address
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnectingIp = headers.get("cf-connecting-ip");
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for");

  let ipAddress: string | null = null;

  if (cfConnectingIp) {
    ipAddress = cfConnectingIp;
  } else if (vercelForwardedFor) {
    ipAddress = vercelForwardedFor.split(",")[0]?.trim() || null;
  } else if (forwardedFor) {
    ipAddress = forwardedFor.split(",")[0]?.trim() || null;
  } else if (realIp) {
    ipAddress = realIp;
  }

  // Get user agent
  const userAgent = headers.get("user-agent");

  // Get the page URL from the request
  const pageUrl = request.url || null;

  return {
    ipAddress,
    userAgent,
    pageUrl,
  };
}

/**
 * Create a minimal context for server-side operations
 * where request context is not available
 */
export function createServerContext(
  metadata?: { userId?: string; action?: string }
): RequestContext {
  return {
    ipAddress: null,
    userAgent: "Lexport Server",
    pageUrl: null,
    sessionId: metadata?.userId ? `server-${metadata.userId}` : undefined,
  };
}
