/**
 * Audit Logger Utility
 *
 * Provides comprehensive audit logging for contract lifecycle events.
 * Captures IP, user agent, geolocation, and device information.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  AuditEventType,
  GeoLocation,
  DeviceInfo,
  AuditLog,
} from "@/db/types";

// Request context extracted from headers
export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  pageUrl: string | null;
  sessionId?: string;
}

// Options for logging an audit event
export interface AuditLogOptions {
  contractId: string;
  eventType: AuditEventType;
  userId?: string | null;
  signatureRequestId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  affectedFields?: string[];
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  context?: RequestContext;
}

/**
 * Parse user agent string to extract device information
 */
export function parseUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return { deviceType: "unknown" };
  }

  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser: string | undefined;
  let browserVersion: string | undefined;

  if (ua.includes("firefox")) {
    browser = "Firefox";
    const match = userAgent.match(/Firefox\/(\d+(\.\d+)?)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("edg/")) {
    browser = "Edge";
    const match = userAgent.match(/Edg\/(\d+(\.\d+)?)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Chrome";
    const match = userAgent.match(/Chrome\/(\d+(\.\d+)?)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
    const match = userAgent.match(/Version\/(\d+(\.\d+)?)/i);
    browserVersion = match?.[1];
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera";
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+(\.\d+)?)/i);
    browserVersion = match?.[1];
  }

  // Detect OS
  let os: string | undefined;
  let osVersion: string | undefined;

  if (ua.includes("windows nt")) {
    os = "Windows";
    const match = userAgent.match(/Windows NT (\d+\.\d+)/i);
    if (match) {
      const ntVersion = match[1];
      const versionMap: Record<string, string> = {
        "10.0": "10/11",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
        "6.0": "Vista",
        "5.1": "XP",
      };
      osVersion = versionMap[ntVersion] || ntVersion;
    }
  } else if (ua.includes("mac os x")) {
    os = "macOS";
    const match = userAgent.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/i);
    osVersion = match?.[1]?.replace(/_/g, ".");
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
    const match = userAgent.match(/Android (\d+(\.\d+)?)/i);
    osVersion = match?.[1];
  } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    os = "iOS";
    const match = userAgent.match(/OS (\d+[_]\d+([_]\d+)?)/i);
    osVersion = match?.[1]?.replace(/_/g, ".");
  }

  // Detect device type
  let deviceType: DeviceInfo["deviceType"] = "desktop";
  let device: string | undefined;
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(
    ua
  );

  if (isMobile) {
    if (/ipad|tablet|playbook|silk/i.test(ua)) {
      deviceType = "tablet";
      if (ua.includes("ipad")) device = "iPad";
    } else {
      deviceType = "mobile";
      if (ua.includes("iphone")) device = "iPhone";
      else if (ua.includes("android")) device = "Android Device";
    }
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    deviceType,
    isMobile,
  };
}

/**
 * Fetch geolocation data from IP address using ip-api.com (free tier)
 * Note: Free tier has rate limits (45 requests per minute from an IP)
 */
export async function getGeoLocation(
  ipAddress: string | null
): Promise<GeoLocation | null> {
  if (!ipAddress || ipAddress === "127.0.0.1" || ipAddress === "::1") {
    return null;
  }

  try {
    // Use ip-api.com free tier (no API key required)
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,query`,
      {
        signal: AbortSignal.timeout(3000), // 3 second timeout
        cache: "force-cache" // Cache results
      }
    );

    if (!response.ok) {
      console.warn("Geolocation lookup failed:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== "success") {
      return null;
    }

    return {
      ip: data.query || ipAddress,
      city: data.city,
      region: data.regionName,
      country: data.country,
      countryCode: data.countryCode,
      timezone: data.timezone,
      latitude: data.lat,
      longitude: data.lon,
      isp: data.isp,
    };
  } catch (error) {
    // Silently fail - geolocation is not critical
    console.warn("Geolocation lookup error:", error);
    return null;
  }
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(
  options: AuditLogOptions
): Promise<AuditLog | null> {
  try {
    const supabase = await createClient();

    // Parse device info from user agent
    const deviceInfo = parseUserAgent(options.context?.userAgent || null);

    // Fetch geolocation (non-blocking - we don't await if it fails)
    let geoLocation: GeoLocation | null = null;
    try {
      geoLocation = await getGeoLocation(options.context?.ipAddress || null);
    } catch {
      // Geolocation is optional, continue without it
    }

    const auditData = {
      contract_id: options.contractId,
      event_type: options.eventType,
      user_id: options.userId || null,
      signature_request_id: options.signatureRequestId || null,
      actor_email: options.actorEmail || null,
      actor_name: options.actorName || null,
      ip_address: options.context?.ipAddress || null,
      user_agent: options.context?.userAgent || null,
      geo_location: geoLocation,
      device_info: deviceInfo,
      affected_fields: options.affectedFields || null,
      old_value: options.oldValue || null,
      new_value: options.newValue || null,
      page_url: options.context?.pageUrl || null,
      session_id: options.context?.sessionId || null,
      metadata: options.metadata || null,
    };

    const { data, error } = await supabase
      .from("audit_logs")
      .insert(auditData)
      .select()
      .single();

    if (error) {
      console.error("Failed to log audit event:", error);
      return null;
    }

    return data as AuditLog;
  } catch (error) {
    console.error("Audit logging error:", error);
    return null;
  }
}

/**
 * Convenience functions for common audit events
 */
export const auditLogger = {
  // Generic log method
  async log(options: AuditLogOptions) {
    return logAuditEvent(options);
  },

  // Contract events
  async contractCreated(
    contractId: string,
    userId: string,
    actorEmail: string,
    actorName: string | null,
    metadata?: Record<string, unknown>,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "contract_created",
      userId,
      actorEmail,
      actorName,
      metadata,
      context,
    });
  },

  async contractViewed(
    contractId: string,
    userId: string | null,
    actorEmail: string | null,
    actorName: string | null,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "contract_viewed",
      userId,
      actorEmail,
      actorName,
      context,
    });
  },

  async contractUpdated(
    contractId: string,
    userId: string,
    actorEmail: string,
    actorName: string | null,
    affectedFields: string[],
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "contract_updated",
      userId,
      actorEmail,
      actorName,
      affectedFields,
      oldValue,
      newValue,
      context,
    });
  },

  async contractSent(
    contractId: string,
    userId: string,
    actorEmail: string,
    actorName: string | null,
    recipientEmails: string[],
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "contract_sent",
      userId,
      actorEmail,
      actorName,
      metadata: { recipients: recipientEmails },
      context,
    });
  },

  async contractCompleted(
    contractId: string,
    userId: string | null,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "contract_completed",
      userId,
      context,
    });
  },

  // PDF events
  async pdfDownloaded(
    contractId: string,
    userId: string | null,
    actorEmail: string | null,
    actorName: string | null,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "pdf_downloaded",
      userId,
      actorEmail,
      actorName,
      context,
    });
  },

  async pdfGenerated(
    contractId: string,
    userId: string | null,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "pdf_generated",
      userId,
      context,
    });
  },

  // Signature events
  async signatureRequested(
    contractId: string,
    userId: string,
    signatureRequestId: string,
    signerEmail: string,
    signerName: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "signature_requested",
      userId,
      signatureRequestId,
      metadata: { signer_email: signerEmail, signer_name: signerName },
      context,
    });
  },

  async signatureRequestViewed(
    contractId: string,
    signatureRequestId: string,
    signerEmail: string,
    signerName: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "signature_request_viewed",
      signatureRequestId,
      actorEmail: signerEmail,
      actorName: signerName,
      context,
    });
  },

  async signatureCompleted(
    contractId: string,
    signatureRequestId: string,
    signerEmail: string,
    signerName: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "signature_completed",
      signatureRequestId,
      actorEmail: signerEmail,
      actorName: signerName,
      context,
    });
  },

  async signatureDeclined(
    contractId: string,
    signatureRequestId: string,
    signerEmail: string,
    signerName: string,
    reason?: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "signature_declined",
      signatureRequestId,
      actorEmail: signerEmail,
      actorName: signerName,
      metadata: reason ? { decline_reason: reason } : undefined,
      context,
    });
  },

  async reminderSent(
    contractId: string,
    userId: string | null,
    signatureRequestId: string,
    recipientEmail: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "reminder_sent",
      userId,
      signatureRequestId,
      metadata: { recipient_email: recipientEmail },
      context,
    });
  },

  // Field events
  async fieldAdded(
    contractId: string,
    userId: string,
    actorEmail: string,
    fieldId: string,
    fieldType: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "field_added",
      userId,
      actorEmail,
      metadata: { field_id: fieldId, field_type: fieldType },
      context,
    });
  },

  async fieldDeleted(
    contractId: string,
    userId: string,
    actorEmail: string,
    fieldId: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "field_deleted",
      userId,
      actorEmail,
      metadata: { field_id: fieldId },
      context,
    });
  },

  // Payment events
  async paymentCompleted(
    contractId: string,
    userId: string | null,
    payerEmail: string,
    amount: number,
    currency: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "payment_completed",
      userId,
      actorEmail: payerEmail,
      metadata: { amount, currency },
      context,
    });
  },

  async paymentFailed(
    contractId: string,
    userId: string | null,
    payerEmail: string,
    reason: string,
    context?: RequestContext
  ) {
    return logAuditEvent({
      contractId,
      eventType: "payment_failed",
      userId,
      actorEmail: payerEmail,
      metadata: { failure_reason: reason },
      context,
    });
  },
};

export default auditLogger;
