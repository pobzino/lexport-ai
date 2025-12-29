/**
 * IP Geolocation Utility
 *
 * Provides IP-to-location lookup for audit trail enhancement.
 * Uses ip-api.com (free tier: 45 requests/minute)
 */

import type { GeoLocation } from "@/db/types";

// Cache to avoid hitting rate limits
const geoCache = new Map<string, { data: GeoLocation; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Look up geographic location from an IP address
 * @param ip The IP address to look up
 * @returns GeoLocation object or null if lookup fails
 */
export async function lookupGeoLocation(ip: string): Promise<GeoLocation | null> {
  // Skip private/local IPs
  if (isPrivateIP(ip)) {
    return {
      ip,
      city: "Local",
      region: "Local Network",
      country: "Local",
      countryCode: "LO",
    };
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    // Use ip-api.com (free, no API key needed for non-commercial use)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp`,
      {
        signal: AbortSignal.timeout(3000), // 3 second timeout
      }
    );

    if (!response.ok) {
      console.error("Geolocation API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.status === "fail") {
      console.error("Geolocation lookup failed:", data.message);
      return null;
    }

    const geoLocation: GeoLocation = {
      ip,
      city: data.city || undefined,
      region: data.regionName || undefined,
      country: data.country || undefined,
      countryCode: data.countryCode || undefined,
      timezone: data.timezone || undefined,
      latitude: data.lat || undefined,
      longitude: data.lon || undefined,
      isp: data.isp || undefined,
    };

    // Cache the result
    geoCache.set(ip, {
      data: geoLocation,
      expires: Date.now() + CACHE_TTL,
    });

    return geoLocation;
  } catch (error) {
    console.error("Geolocation lookup error:", error);
    return null;
  }
}

/**
 * Check if an IP address is private/local
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  if (ip === "127.0.0.1" || ip === "localhost" || ip === "::1") {
    return true;
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) {
    return false; // IPv6 or invalid
  }

  // 10.x.x.x
  if (parts[0] === 10) return true;

  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

/**
 * Parse user agent string into device info
 */
export function parseUserAgent(userAgent: string): {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  isMobile?: boolean;
} {
  if (!userAgent) {
    return { deviceType: "unknown" };
  }

  const ua = userAgent.toLowerCase();
  let browser: string | undefined;
  let browserVersion: string | undefined;
  let os: string | undefined;
  let osVersion: string | undefined;
  let deviceType: "desktop" | "mobile" | "tablet" | "unknown" = "unknown";
  let isMobile = false;

  // Detect browser
  if (ua.includes("firefox")) {
    browser = "Firefox";
    const match = userAgent.match(/Firefox\/(\d+\.?\d*)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("edg/")) {
    browser = "Edge";
    const match = userAgent.match(/Edg\/(\d+\.?\d*)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("chrome")) {
    browser = "Chrome";
    const match = userAgent.match(/Chrome\/(\d+\.?\d*)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
    const match = userAgent.match(/Version\/(\d+\.?\d*)/i);
    browserVersion = match?.[1];
  }

  // Detect OS
  if (ua.includes("windows")) {
    os = "Windows";
    if (ua.includes("windows nt 10")) osVersion = "10";
    else if (ua.includes("windows nt 11")) osVersion = "11";
    deviceType = "desktop";
  } else if (ua.includes("mac os x")) {
    os = "macOS";
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/i);
    osVersion = match?.[1]?.replace("_", ".");
    deviceType = "desktop";
  } else if (ua.includes("iphone")) {
    os = "iOS";
    const match = userAgent.match(/OS (\d+[._]\d+)/i);
    osVersion = match?.[1]?.replace("_", ".");
    deviceType = "mobile";
    isMobile = true;
  } else if (ua.includes("ipad")) {
    os = "iPadOS";
    deviceType = "tablet";
    isMobile = true;
  } else if (ua.includes("android")) {
    os = "Android";
    const match = userAgent.match(/Android (\d+\.?\d*)/i);
    osVersion = match?.[1];
    if (ua.includes("mobile")) {
      deviceType = "mobile";
    } else {
      deviceType = "tablet";
    }
    isMobile = true;
  } else if (ua.includes("linux")) {
    os = "Linux";
    deviceType = "desktop";
  }

  return { browser, browserVersion, os, osVersion, deviceType, isMobile };
}

/**
 * Format location for display
 */
export function formatLocation(geo: GeoLocation | null): string {
  if (!geo) return "Unknown";

  const parts = [geo.city, geo.region, geo.countryCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown";
}
