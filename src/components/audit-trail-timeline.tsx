"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Edit3,
  Send,
  Eye,
  Download,
  PenTool,
  XCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Mail,
  Share2,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  AlertCircle,
  MapPin,
  Monitor,
  Globe,
} from "lucide-react";
import type { AuditLogWithDetails, AuditEventType, GeoLocation, DeviceInfo } from "@/db/types";

// Icon mapping for event types
const EVENT_ICONS: Record<AuditEventType, React.ElementType> = {
  // Contract lifecycle
  contract_created: FileText,
  contract_updated: Edit3,
  contract_deleted: Trash2,
  contract_sent: Send,
  contract_viewed: Eye,
  contract_completed: CheckCircle2,
  contract_expired: Clock,
  contract_downloaded: Download,
  // Signature events
  signature_requested: PenTool,
  signature_request_sent: Send,
  signature_request_viewed: Eye,
  signature_request_resent: RefreshCw,
  signature_completed: CheckCircle2,
  signature_declined: XCircle,
  // Document events
  document_viewed: Eye,
  document_printed: FileText,
  pdf_generated: FileText,
  pdf_downloaded: Download,
  // Payment events
  payment_initiated: DollarSign,
  payment_completed: DollarSign,
  payment_failed: XCircle,
  payment_refunded: RefreshCw,
  invoice_created: FileText,
  invoice_sent: Mail,
  invoice_paid: CheckCircle2,
  // Field events
  field_added: Plus,
  field_updated: Edit3,
  field_deleted: Trash2,
  field_value_entered: Edit3,
  // Access events
  access_granted: CheckCircle2,
  access_revoked: XCircle,
  link_shared: Share2,
  reminder_sent: Mail,
};

// Color classes for event types
const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Contract lifecycle - blue
  contract_created: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  contract_updated: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  contract_deleted: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
  contract_sent: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
  contract_viewed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  contract_completed: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  contract_expired: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  contract_downloaded: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  // Signature events - violet/green
  signature_requested: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
  signature_request_sent: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
  signature_request_viewed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  signature_request_resent: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  signature_completed: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  signature_declined: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
  // Document events
  document_viewed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  document_printed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  pdf_generated: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  pdf_downloaded: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  // Payment events - green
  payment_initiated: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  payment_completed: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  payment_failed: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
  payment_refunded: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  invoice_created: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  invoice_sent: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
  invoice_paid: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  // Field events
  field_added: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  field_updated: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  field_deleted: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
  field_value_entered: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  // Access events
  access_granted: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  access_revoked: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
  link_shared: { bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
  reminder_sent: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
};

// Default colors for unknown event types
const DEFAULT_COLORS = { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" };

interface AuditTrailTimelineProps {
  contractId: string;
  initialEventType?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function AuditTrailTimeline({
  contractId,
  initialEventType,
}: AuditTrailTimelineProps) {
  const [logs, setLogs] = useState<AuditLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterEventType, setFilterEventType] = useState<string>(initialEventType || "");
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const fetchLogs = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (filterEventType) {
        params.set("eventType", filterEventType);
      }

      const response = await fetch(
        `/api/contracts/${contractId}/audit?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setAvailableFilters(data.filters.availableEventTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [contractId, filterEventType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatLocation = (geo: GeoLocation | null): string => {
    if (!geo) return "";
    const parts = [geo.city, geo.region, geo.countryCode].filter(Boolean);
    return parts.join(", ");
  };

  const formatDevice = (device: DeviceInfo | null): string => {
    if (!device) return "";
    const parts = [];
    if (device.browser) parts.push(device.browser);
    if (device.os) parts.push(device.os);
    if (device.deviceType && device.deviceType !== "unknown") {
      parts.push(`(${device.deviceType})`);
    }
    return parts.join(" on ");
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        <span className="ml-2 text-slate-600">Loading audit trail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All events</option>
            {availableFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-slate-500">
          {pagination.total} event{pagination.total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No audit events found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

          {/* Events */}
          <div className="space-y-4">
            {logs.map((log) => {
              const Icon = EVENT_ICONS[log.event_type] || FileText;
              const colors = EVENT_COLORS[log.event_type] || DEFAULT_COLORS;
              const isExpanded = expandedIds.has(log.id);
              const hasDetails =
                log.ip_address ||
                log.geo_location ||
                log.device_info ||
                log.affected_fields?.length ||
                log.metadata;

              return (
                <div key={log.id} className="relative pl-14">
                  {/* Icon */}
                  <div
                    className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <div
                    className={`bg-white rounded-lg border border-slate-200 p-4 ${
                      hasDetails ? "cursor-pointer hover:border-slate-300" : ""
                    }`}
                    onClick={() => hasDetails && toggleExpanded(log.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {log.event_description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                          <span>{log.actor_display_name}</span>
                          <span className="text-slate-300">|</span>
                          <span title={formatDate(log.created_at)}>
                            {log.time_ago}
                          </span>
                        </div>
                      </div>
                      {hasDetails && (
                        <button className="p-1 hover:bg-slate-100 rounded">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && hasDetails && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        {/* Actor info */}
                        {log.actor_email && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span>{log.actor_email}</span>
                          </div>
                        )}

                        {/* IP Address */}
                        {log.ip_address && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span>IP: {log.ip_address}</span>
                          </div>
                        )}

                        {/* Location */}
                        {log.geo_location && formatLocation(log.geo_location as GeoLocation) && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{formatLocation(log.geo_location as GeoLocation)}</span>
                          </div>
                        )}

                        {/* Device */}
                        {log.device_info && formatDevice(log.device_info as DeviceInfo) && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Monitor className="w-4 h-4 text-slate-400" />
                            <span>{formatDevice(log.device_info as DeviceInfo)}</span>
                          </div>
                        )}

                        {/* Affected fields */}
                        {log.affected_fields && log.affected_fields.length > 0 && (
                          <div className="text-sm">
                            <span className="text-slate-500">Fields changed: </span>
                            <span className="text-slate-700">
                              {log.affected_fields.join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Metadata */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="text-sm">
                            <span className="text-slate-500">Details: </span>
                            <pre className="mt-1 p-2 bg-slate-50 rounded text-xs text-slate-600 overflow-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-slate-400 pt-2">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={!pagination.hasMore || loading}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AuditTrailTimeline;
