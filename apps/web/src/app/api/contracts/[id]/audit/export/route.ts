import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/db/types";

export const dynamic = "force-dynamic";

// GET - Export audit logs in CSV or JSON format
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "json";

    const { data: logs, error: logsError } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });

    if (logsError) {
      console.error("Error fetching audit logs:", logsError);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    const auditLogs = logs as AuditLog[];
    const safeTitle = contract.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = "audit-trail-" + safeTitle + "-" + dateStr;

    if (format === "csv") {
      const headers = [
        "Timestamp",
        "Event Type",
        "Actor Email",
        "Actor Name",
        "IP Address",
        "Location",
        "Device",
        "Metadata",
      ];

      const rows = auditLogs.map((log) => {
        const geo = log.geo_location as { city?: string; region?: string; countryCode?: string } | null;
        const device = log.device_info as { browser?: string; os?: string; deviceType?: string } | null;
        const location = geo ? [geo.city, geo.region, geo.countryCode].filter(Boolean).join(", ") : "";
        const deviceStr = device ? [device.browser, device.os].filter(Boolean).join(" on ") : "";

        return [
          log.created_at,
          log.event_type,
          log.actor_email || "",
          log.actor_name || "",
          log.ip_address || "",
          location,
          deviceStr,
          log.metadata ? JSON.stringify(log.metadata) : "",
        ].map((field) => '"' + String(field).replace(/"/g, '""') + '"').join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="' + filename + '.csv"',
        },
      });
    } else {
      const exportData = {
        contract: {
          id: contract.id,
          title: contract.title,
        },
        exportedAt: new Date().toISOString(),
        totalEvents: auditLogs.length,
        events: auditLogs.map((log) => ({
          timestamp: log.created_at,
          eventType: log.event_type,
          actor: {
            email: log.actor_email,
            name: log.actor_name,
            userId: log.user_id,
          },
          context: {
            ipAddress: log.ip_address,
            location: log.geo_location,
            device: log.device_info,
          },
          changes: {
            affectedFields: log.affected_fields,
            oldValue: log.old_value,
            newValue: log.new_value,
          },
          metadata: log.metadata,
        })),
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="' + filename + '.json"',
        },
      });
    }
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
