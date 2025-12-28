import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditEventType, AuditLog, AuditLogWithDetails } from "@/db/types";

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

// Calculate relative time (e.g., "2 hours ago")
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;

  return date.toLocaleDateString();
}

// Get display name for actor
function getActorDisplayName(log: AuditLog): string {
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  if (log.user_id) return "User";
  return "System";
}

// Enrich audit log with computed fields
function enrichAuditLog(log: AuditLog): AuditLogWithDetails {
  return {
    ...log,
    actor_display_name: getActorDisplayName(log),
    event_description:
      EVENT_DESCRIPTIONS[log.event_type] || log.event_type.replace(/_/g, " "),
    time_ago: getTimeAgo(log.created_at),
  };
}

// GET - List audit logs for a contract
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
      .select("id, user_id")
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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const eventType = searchParams.get("eventType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
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

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error("Error fetching audit logs:", logsError);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    // Enrich logs with computed fields
    const enrichedLogs = (logs || []).map((log) =>
      enrichAuditLog(log as AuditLog)
    );

    // Get unique event types for filtering
    const { data: eventTypes } = await supabase
      .from("audit_logs")
      .select("event_type")
      .eq("contract_id", contractId);

    const uniqueEventTypes = [
      ...new Set((eventTypes || []).map((e) => e.event_type)),
    ].sort();

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
      filters: {
        availableEventTypes: uniqueEventTypes.map((type) => ({
          value: type,
          label: EVENT_DESCRIPTIONS[type as AuditEventType] || type,
        })),
      },
    });
  } catch (error) {
    console.error("Error in audit logs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
