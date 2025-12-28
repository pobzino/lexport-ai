/**
 * Audit Trail Module
 *
 * Re-exports all audit-related utilities for easy importing
 */

export {
  logAuditEvent,
  auditLogger,
  parseUserAgent,
  getGeoLocation,
  type RequestContext,
  type AuditLogOptions,
} from "./logger";

export {
  getRequestContext,
  getRequestContextFromRequest,
  createServerContext,
} from "./context";
