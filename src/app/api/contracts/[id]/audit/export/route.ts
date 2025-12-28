import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditEventType, AuditLog, GeoLocation, DeviceInfo } from "@/db/types";

// Event type to human-readable description mapping
const EVENT_DESCRIPTIONS: Record<AuditEventType, string> = {
  // Contract lifecycle
  contract_created: "Contract created",
  contract_updated: "Contract updated",
  contract_deleted: "Contract deleted",
  contract_sent: "Contract sent for signature",
  contract_viewed: "Contract viewed",
  contract_completed: "Contract completed",
  contract_expired: "Contract expired",
  contract_downloaded: "Contract downloaded",
  // Signature events
  signature_requested: "Signature requested",
  signature_request_sent: "Signature request sent",
  signature_request_viewed: "Signature request viewed",
  signature_request_resent: "Signature request resent",
  signature_completed: "Document signed",
  signature_declined: "Signature declined",
  // Document events
  document_viewed: "Document viewed",
  document_printed: "Document printed",
  pdf_generated: "PDF generated",
  pdf_downloaded: "PDF downloaded",
  // Payment events
  payment_initiated: "Payment initiated",
  payment_completed: "Payment completed",
  payment_failed: "Payment failed",
  payment_refunded: "Payment refunded",
  invoice_created: "Invoice created",
  invoice_sent: "Invoice sent",
  invoice_paid: "Invoice paid",
  // Field events
  field_added: "Field added",
  field_updated: "Field updated",
  field_deleted: "Field deleted",
  field_value_entered: "Field value entered",
  // Access events
  access_granted: "Access granted",
  access_revoked: "Access revoked",
  link_shared: "Link shared",
  reminder_sent: "Reminder sent",
};

// Format date for CSV export
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString();
}

// Format location for display
function formatLocation(geo: GeoLocation | null): string {
  if (!geo) return "";
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.join(", ");
}

// Format device info for display
function formatDevice(device: DeviceInfo | null): string {
  if (!device) return "";
  const parts = [];
  if (device.browser) {
    parts.push(`${device.browser}${device.browserVersion ? ` ${device.browserVersion}` : ""}`);
  }
  if (device.os) {
    parts.push(`${device.os}${device.osVersion ? ` ${device.osVersion}` : ""}`);
  }
  if (device.deviceType && device.deviceType !== "unknown") {
    parts.push(device.deviceType);
  }
  return parts.join(" / ");
}

// Convert log to CSV row
function logToCsvRow(log: AuditLog): string[] {
  const geoLocation = log.geo_location as GeoLocation | null;
  const deviceInfo = log.device_info as DeviceInfo | null;

  return [
    formatDate(log.created_at),
    EVENT_DESCRIPTIONS[log.event_type] || log.event_type,
    log.actor_name || log.actor_email || "System",
    log.actor_email || "",
    log.ip_address || "",
    formatLocation(geoLocation),
    formatDevice(deviceInfo),
    log.affected_fields?.join("; ") || "",
    log.metadata ? JSON.stringify(log.metadata) : "",
  ];
}

// Escape CSV value
function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Convert logs to CSV string
function convertToCSV(logs: AuditLog[]): string {
  const headers = [
    "Timestamp",
    "Event",
    "Actor Name",
    "Actor Email",
    "IP Address",
    "Location",
    "Device",
    "Affected Fields",
    "Metadata",
  ];

  const rows = logs.map((log) =>
    logToCsvRow(log).map(escapeCsvValue).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

// GET - Export audit logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, title")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "json";
    const eventType = searchParams.get("eventType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (eventType) {
      query = query.eq("event_type", eventType);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Limit to 10000 records for export
    query = query.limit(10000);

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error("Error fetching audit logs for export:", logsError);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const safeTitle = (contract.title || "contract")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 50);
    const filename = `audit-trail_${safeTitle}_${timestamp}`;

    if (format === "csv") {
      // Export as CSV
      const csv = convertToCSV(logs as AuditLog[]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // Export as JSON
      const exportData = {
        contract: {
          id: contract.id,
          title: contract.title,
        },
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        totalEvents: logs?.length || 0,
        events: (logs || []).map((log) => ({
          ...log,
          event_description:
            EVENT_DESCRIPTIONS[log.event_type as AuditEventType] ||
            log.event_type,
        })),
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }
  } catch (error) {
    console.error("Error in audit logs export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
