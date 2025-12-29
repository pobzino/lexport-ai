import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditEventType } from "@/db/types";

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

// Calculate relative time
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

// GET - List all activity logs for user's contracts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user's contract IDs
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, title")
      .eq("user_id", user.id);

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({
        logs: [],
        stats: {
          total: 0,
          today: 0,
          thisWeek: 0,
          signatures: 0,
          payments: 0,
        },
        filters: {
          availableEventTypes: [],
        },
      });
    }

    const contractIds = contracts.map((c) => c.id);
    const contractTitles = Object.fromEntries(
      contracts.map((c) => [c.id, c.title])
    );

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const eventType = searchParams.get("eventType");
    const dateRange = searchParams.get("dateRange") || "all";
    const offset = (page - 1) * limit;

    // Calculate date filters
    const now = new Date();
    let startDate: Date | null = null;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    // Build query
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .in("contract_id", contractIds)
      .order("created_at", { ascending: false });

    // Apply filters
    if (eventType && eventType !== "all") {
      query = query.eq("event_type", eventType);
    }
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error("Error fetching activity logs:", logsError);
      return NextResponse.json(
        { error: "Failed to fetch activity logs" },
        { status: 500 }
      );
    }

    // Enrich logs with computed fields
    const enrichedLogs = (logs || []).map((log) => ({
      ...log,
      actor_display_name: log.actor_name || log.actor_email || "System",
      event_description:
        EVENT_DESCRIPTIONS[log.event_type as AuditEventType] ||
        log.event_type.replace(/_/g, " "),
      time_ago: getTimeAgo(log.created_at),
      contract_title: log.contract_id ? contractTitles[log.contract_id] : null,
    }));

    // Get stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Total count
    const { count: totalCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .in("contract_id", contractIds);

    // Today count
    const { count: todayCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .in("contract_id", contractIds)
      .gte("created_at", todayStart.toISOString());

    // This week count
    const { count: weekCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .in("contract_id", contractIds)
      .gte("created_at", weekStart.toISOString());

    // Signature events count
    const { count: signaturesCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .in("contract_id", contractIds)
      .in("event_type", [
        "signature_completed",
        "signature_requested",
        "signature_declined",
      ]);

    // Payment events count
    const { count: paymentsCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .in("contract_id", contractIds)
      .in("event_type", [
        "payment_completed",
        "payment_failed",
        "payment_refunded",
        "invoice_paid",
      ]);

    // Get unique event types for filtering
    const { data: eventTypes } = await supabase
      .from("audit_logs")
      .select("event_type")
      .in("contract_id", contractIds);

    const uniqueEventTypes = [
      ...new Set((eventTypes || []).map((e) => e.event_type)),
    ].sort();

    return NextResponse.json({
      logs: enrichedLogs,
      stats: {
        total: totalCount || 0,
        today: todayCount || 0,
        thisWeek: weekCount || 0,
        signatures: signaturesCount || 0,
        payments: paymentsCount || 0,
      },
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
    console.error("Error in activity logs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
