"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Mail,
  PenTool,
  Send,
  User,
  X,
  Check,
  AlertCircle,
  RotateCcw,
  Eye,
  MoreHorizontal,
} from "lucide-react";

type View = "dashboard" | "workspace";
type ContractStatus = "draft" | "pending" | "signed";

// ─── Shared ───────────────────────────────────────────────────────────────────

function TabBar({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {(["dashboard", "workspace"] as View[]).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            view === v
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {v === "dashboard" ? "Dashboard redesign" : "Contract workspace"}
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard redesign ───────────────────────────────────────────────────────

const ACTION_ITEMS = [
  {
    id: 1,
    type: "expiring",
    title: "Acme NDA",
    subtitle: "Sarah Chen hasn't signed · expires in 2 days",
    actions: ["Send reminder", "Extend deadline"],
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    badge: "Expires soon",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  {
    id: 2,
    type: "needs_signature",
    title: "Freelance Agreement — Webflow project",
    subtitle: "Awaiting your signature",
    actions: ["Sign now"],
    icon: PenTool,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    badge: "Your turn",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    type: "pending",
    title: "Independent Contractor — Mark Davies",
    subtitle: "Sent 3 days ago · viewed but not signed",
    actions: ["Send reminder", "View contract"],
    icon: Clock,
    iconColor: "text-slate-400",
    iconBg: "bg-slate-100",
    badge: "Waiting",
    badgeColor: "bg-slate-100 text-slate-600",
  },
  {
    id: 4,
    type: "signed",
    title: "Consulting Agreement — Stripe project",
    subtitle: "Fully signed · 2 days ago",
    actions: ["Download PDF"],
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    badge: "Complete",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 5,
    type: "signed",
    title: "SAFE Note — Seed round",
    subtitle: "Fully signed · 5 days ago",
    actions: ["Download PDF"],
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    badge: "Complete",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
];

function DashboardRedesign() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = ACTION_ITEMS.filter((i) => !dismissed.includes(i.id));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Thin stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total contracts", value: "14", sub: "all time" },
          { label: "Pending signatures", value: "3", sub: "need action", urgent: true },
          { label: "Signed this month", value: "2", sub: "Feb 2026" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${stat.urgent ? "text-amber-600" : "text-slate-900"}`}>
                {stat.value}
              </p>
            </div>
            <p className="text-xs text-slate-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Action feed */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">What needs attention</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sorted by urgency</p>
          </div>
          <button className="text-xs text-[#529ec6] hover:underline">View all contracts</button>
        </div>

        <div className="divide-y divide-slate-100">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.actions.map((action, i) => (
                    <button
                      key={action}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        i === 0
                          ? "bg-[#202e46] text-white hover:bg-[#2d4266]"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                  {item.type === "signed" && (
                    <button
                      onClick={() => setDismissed((d) => [...d, item.id])}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              Nothing needs attention right now.
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Signed contracts fade to the bottom · dismissed items move to /contracts
      </p>
    </div>
  );
}

// ─── Contract workspace redesign ──────────────────────────────────────────────

const CONTRACT_TEXT = `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of January 15, 2026, between Acme Corp, a Delaware corporation ("Party A"), and TechStartup Inc., a California corporation ("Party B").

1. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any information disclosed by either party to the other party, either directly or indirectly, in writing, orally or by inspection of tangible objects, that is designated as "Confidential," "Proprietary" or some similar designation, or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure.

2. OBLIGATIONS OF RECEIVING PARTY

Each party agrees to: (a) hold the other party's Confidential Information in strict confidence; (b) not to disclose such Confidential Information to any third parties; and (c) not to use such Confidential Information for any purpose other than evaluating a potential business relationship between the parties.

3. TERM

This Agreement shall remain in effect for a period of two (2) years from the Effective Date, unless earlier terminated by either party upon thirty (30) days written notice.

4. GOVERNING LAW

This Agreement shall be governed by the laws of the State of California, without regard to its conflict of law provisions.`;

const SIGNERS = [
  { name: "Sarah Chen", email: "sarah@acme.com", role: "Party A", status: "signed" as const },
  { name: "You", email: "me@techstartup.com", role: "Party B", status: "pending" as const },
];

function StatusPanel({ status }: { status: ContractStatus }) {
  if (status === "draft") {
    const checks = [
      { label: "Parties identified", done: true },
      { label: "Effective date set", done: true },
      { label: "Jurisdiction selected", done: true },
      { label: "Payment amount", done: false, note: "Optional for NDA" },
    ];
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ready to send?</p>
          <ul className="mt-3 space-y-2.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${c.done ? "bg-emerald-500" : "bg-slate-200"}`}>
                  {c.done ? <Check className="w-2.5 h-2.5 text-white" /> : null}
                </div>
                <div>
                  <p className={`text-sm ${c.done ? "text-slate-700" : "text-slate-400"}`}>{c.label}</p>
                  {c.note && <p className="text-xs text-slate-400">{c.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Signers</p>
          {[
            { name: "Sarah Chen", email: "sarah@acme.com", role: "Party A" },
            { name: "You", email: "me@techstartup.com", role: "Party B" },
          ].map((s) => (
            <div key={s.email} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-7 h-7 bg-[#529ec6]/20 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#529ec6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400 truncate">{s.role}</p>
              </div>
            </div>
          ))}
          <button className="text-xs text-[#529ec6] hover:underline">+ Add signer</button>
        </div>

        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#202e46] text-white text-sm font-medium rounded-lg hover:bg-[#2d4266] transition-colors">
          <Send className="w-4 h-4" />
          Send for signing
        </button>

        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
          <Eye className="w-4 h-4" />
          Preview PDF
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Signing progress</p>
          <div className="mt-3 space-y-2">
            {SIGNERS.map((s) => (
              <div key={s.email} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "signed" ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.role} · {s.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === "signed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {s.status === "signed" ? "Signed" : "Waiting"}
                  </span>
                </div>
                {s.status === "pending" && (
                  <div className="mt-2.5 flex gap-2">
                    <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-[#202e46] text-white rounded-md hover:bg-[#2d4266] transition-colors">
                      <Mail className="w-3 h-3" />
                      Send reminder
                    </button>
                    <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                      <RotateCcw className="w-3 h-3" />
                      Resend link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800">Expires in 12 days</p>
              <p className="text-xs text-amber-600 mt-0.5">Jan 27, 2026 · Sent 2 days ago</p>
            </div>
          </div>
          <button className="mt-2 text-xs text-amber-700 underline">Extend deadline</button>
        </div>

        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
          <Eye className="w-4 h-4" />
          Preview PDF
        </button>
      </div>
    );
  }

  // signed
  return (
    <div className="space-y-5">
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
        <p className="text-sm font-semibold text-emerald-800 mt-2">Fully signed</p>
        <p className="text-xs text-emerald-600 mt-0.5">Jan 18, 2026 · Both parties signed</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Signers</p>
        <div className="mt-2 space-y-2">
          {SIGNERS.map((s) => (
            <div key={s.email} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{s.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#202e46] text-white text-sm font-medium rounded-lg hover:bg-[#2d4266] transition-colors">
          <Download className="w-4 h-4" />
          Download signed PDF
        </button>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
          <FileText className="w-4 h-4" />
          View certificate
        </button>
      </div>
    </div>
  );
}

function AuditDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const events = [
    { label: "Sarah Chen signed", time: "Jan 18, 2026 · 9:41 AM", icon: PenTool, color: "text-emerald-500" },
    { label: "You signed", time: "Jan 18, 2026 · 9:55 AM", icon: PenTool, color: "text-emerald-500" },
    { label: "Sarah Chen viewed", time: "Jan 17, 2026 · 3:12 PM", icon: Eye, color: "text-blue-500" },
    { label: "Signing link sent to Sarah Chen", time: "Jan 15, 2026 · 2:00 PM", icon: Send, color: "text-slate-400" },
    { label: "Contract created", time: "Jan 15, 2026 · 1:48 PM", icon: FileText, color: "text-slate-400" },
  ];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-80 bg-white h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-900">Audit trail</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <ol className="relative border-l border-slate-200 space-y-6">
            {events.map((e) => {
              const Icon = e.icon;
              return (
                <li key={e.label} className="ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 bg-white border-2 border-slate-300 rounded-full" />
                  <div className="flex items-start gap-2">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${e.color}`} />
                    <div>
                      <p className="text-xs font-medium text-slate-800">{e.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{e.time}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

function ContractWorkspace() {
  const [status, setStatus] = useState<ContractStatus>("draft");
  const [auditOpen, setAuditOpen] = useState(false);

  const statusLabels: Record<ContractStatus, string> = {
    draft: "Draft",
    pending: "Pending signatures",
    signed: "Signed",
  };

  const statusColors: Record<ContractStatus, string> = {
    draft: "bg-slate-100 text-slate-600",
    pending: "bg-amber-100 text-amber-700",
    signed: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-4">
      {/* Simulated breadcrumb + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="hover:text-slate-700 cursor-pointer">Contracts</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Acme Corp — Mutual NDA</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Status switcher (prototype control) */}
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
          <span className="text-xs text-slate-400 pl-1">Preview as:</span>
          {(["draft", "pending", "signed"] as ContractStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace split */}
      <div className="flex gap-4 items-start">
        {/* Left: contract content */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            {status === "draft" ? (
              <>
                <button className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium transition-colors">Edit</button>
                <button className="text-xs px-3 py-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">History</button>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">Read-only · contract is {status === "pending" ? "out for signing" : "fully executed"}</span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setAuditOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Audit trail
            </button>
            <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Contract text */}
          <div
            className={`p-8 max-h-[520px] overflow-y-auto text-sm leading-relaxed text-slate-700 font-mono whitespace-pre-wrap ${
              status !== "draft" ? "select-text cursor-default" : ""
            }`}
          >
            {CONTRACT_TEXT}
          </div>
        </div>

        {/* Right: status panel */}
        <div className="w-64 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-5">
          <StatusPanel status={status} />
        </div>
      </div>

      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignTestPage() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Design prototypes</h1>
        <p className="text-sm text-slate-500 mt-1">Exploring redesigns for dashboard and contract workspace</p>
      </div>

      <TabBar view={view} setView={setView} />

      {view === "dashboard" ? <DashboardRedesign /> : <ContractWorkspace />}
    </div>
  );
}
