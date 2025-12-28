"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
    RefreshCw,
    Filter,
    Loader2,
    AlertCircle,
    Activity,
    Calendar,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from "lucide-react";

// Event type icons
const EVENT_ICONS: Record<string, React.ElementType> = {
    contract_created: FileText,
    contract_updated: Edit3,
    contract_sent: Send,
    contract_viewed: Eye,
    contract_completed: CheckCircle2,
    contract_downloaded: Download,
    signature_requested: PenTool,
    signature_completed: CheckCircle2,
    signature_declined: XCircle,
    document_viewed: Eye,
    payment_completed: DollarSign,
    payment_failed: XCircle,
    payment_refunded: RefreshCw,
    invoice_sent: Mail,
};

// Event type colors
const EVENT_COLORS: Record<string, { bg: string; text: string }> = {
    contract_created: { bg: "bg-blue-100", text: "text-blue-600" },
    contract_updated: { bg: "bg-blue-100", text: "text-blue-600" },
    contract_sent: { bg: "bg-violet-100", text: "text-violet-600" },
    contract_viewed: { bg: "bg-slate-100", text: "text-slate-600" },
    contract_completed: { bg: "bg-emerald-100", text: "text-emerald-600" },
    contract_downloaded: { bg: "bg-blue-100", text: "text-blue-600" },
    signature_requested: { bg: "bg-violet-100", text: "text-violet-600" },
    signature_completed: { bg: "bg-emerald-100", text: "text-emerald-600" },
    signature_declined: { bg: "bg-red-100", text: "text-red-600" },
    document_viewed: { bg: "bg-slate-100", text: "text-slate-600" },
    payment_completed: { bg: "bg-emerald-100", text: "text-emerald-600" },
    payment_failed: { bg: "bg-red-100", text: "text-red-600" },
    payment_refunded: { bg: "bg-amber-100", text: "text-amber-600" },
    invoice_sent: { bg: "bg-violet-100", text: "text-violet-600" },
};

const DEFAULT_COLORS = { bg: "bg-slate-100", text: "text-slate-600" };

// Event type labels
const EVENT_LABELS: Record<string, string> = {
    contract_created: "Contract Created",
    contract_updated: "Contract Updated",
    contract_sent: "Contract Sent",
    contract_viewed: "Contract Viewed",
    contract_completed: "Contract Completed",
    contract_downloaded: "Contract Downloaded",
    signature_requested: "Signature Requested",
    signature_completed: "Signature Completed",
    signature_declined: "Signature Declined",
    document_viewed: "Document Viewed",
    payment_completed: "Payment Completed",
    payment_failed: "Payment Failed",
    payment_refunded: "Payment Refunded",
    invoice_sent: "Invoice Sent",
};

interface AuditLog {
    id: string;
    contract_id: string;
    contract_title: string;
    event_type: string;
    ip_address: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    actor_name: string | null;
    actor_email: string | null;
}

interface Stats {
    total: number;
    today: number;
    thisWeek: number;
    signatures: number;
    payments: number;
}

export default function ActivityPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, today: 0, thisWeek: 0, signatures: 0, payments: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eventFilter, setEventFilter] = useState<string>("");
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const fetchActivity = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (eventFilter) params.set("eventType", eventFilter);
            if (dateFilter !== "all") params.set("dateRange", dateFilter);

            const response = await fetch(`/api/activity?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch activity");

            const data = await response.json();
            setLogs(data.logs || []);
            setStats(data.stats || { total: 0, today: 0, thisWeek: 0, signatures: 0, payments: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [eventFilter, dateFilter]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

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

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getEventDescription = (log: AuditLog) => {
        const actor = log.actor_name || log.actor_email || "Someone";
        const eventLabel = EVENT_LABELS[log.event_type] || log.event_type.replace(/_/g, " ");

        switch (log.event_type) {
            case "contract_created":
                return `${actor} created a new contract`;
            case "contract_sent":
                return `${actor} sent the contract for signature`;
            case "signature_completed":
                return `${actor} signed the contract`;
            case "signature_declined":
                return `${actor} declined to sign`;
            case "payment_completed":
                return `${actor} completed a payment`;
            case "document_viewed":
                return `${actor} viewed the document`;
            default:
                return `${actor} - ${eventLabel}`;
        }
    };

    // Get unique event types from logs for filter
    const uniqueEventTypes = [...new Set(logs.map(l => l.event_type))];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
                    <p className="text-slate-500 mt-1">
                        Track all activity across your contracts
                    </p>
                </div>
                <button
                    onClick={fetchActivity}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            <p className="text-xs text-slate-500">Total Events</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.today}</p>
                            <p className="text-xs text-slate-500">Today</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.thisWeek}</p>
                            <p className="text-xs text-slate-500">This Week</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <PenTool className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.signatures}</p>
                            <p className="text-xs text-slate-500">Signatures</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.payments}</p>
                            <p className="text-xs text-slate-500">Payments</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Filters:</span>
                    </div>

                    {/* Event Type Filter */}
                    <select
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">All Events</option>
                        {uniqueEventTypes.map((type) => (
                            <option key={type} value={type}>
                                {EVENT_LABELS[type] || type.replace(/_/g, " ")}
                            </option>
                        ))}
                    </select>

                    {/* Date Range Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>

                    {(eventFilter || dateFilter !== "all") && (
                        <button
                            onClick={() => {
                                setEventFilter("");
                                setDateFilter("all");
                            }}
                            className="text-sm text-slate-500 hover:text-slate-700"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        <span className="ml-2 text-slate-600">Loading activity...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-600">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span>{error}</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Activity className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No activity yet</h3>
                        <p className="text-slate-500">
                            Activity will appear here when you create and send contracts.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {logs.map((log) => {
                            const Icon = EVENT_ICONS[log.event_type] || FileText;
                            const colors = EVENT_COLORS[log.event_type] || DEFAULT_COLORS;
                            const isExpanded = expandedIds.has(log.id);

                            return (
                                <div
                                    key={log.id}
                                    className="p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                                            <Icon className={`w-5 h-5 ${colors.text}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {getEventDescription(log)}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Link
                                                            href={`/contracts/${log.contract_id}/edit`}
                                                            className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                                                        >
                                                            {log.contract_title}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-sm text-slate-500">
                                                        {formatTimeAgo(log.created_at)}
                                                    </span>
                                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                        <button
                                                            onClick={() => toggleExpanded(log.id)}
                                                            className="p-1 hover:bg-slate-100 rounded"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-4 h-4 text-slate-400" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && log.metadata && (
                                                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                                    <p className="text-xs text-slate-500 mb-1">Details</p>
                                                    <pre className="text-xs text-slate-600 overflow-auto">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        {formatDate(log.created_at)}
                                                        {log.ip_address && ` • IP: ${log.ip_address}`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
