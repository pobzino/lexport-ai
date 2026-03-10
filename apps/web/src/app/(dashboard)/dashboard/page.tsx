import Link from "next/link";
import {
  FileText,
  PenTool,
  Clock,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileStack,
  ArrowRight,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_TYPES } from "@/lib/contracts/schemas";
import { DashboardChecklistWrapper } from "@/components/onboarding";
import { UpgradeCard } from "@/components/dashboard/UpgradeCard";
import { UsageWarning } from "@/components/dashboard/UsageWarning";

// Icon mapping for contract types
const CONTRACT_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  briefcase: Briefcase,
  users: Users,
  "trending-up": TrendingUp,
  edit: Edit,
};

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  updated_at: string;
  expires_at?: string | null;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
}

interface SignatureRequest {
  id: string;
  signer_name: string;
  signer_email: string;
  status: string;
}

interface PendingContract {
  id: string;
  title: string;
  type: string;
  status: string;
  updated_at: string;
  expires_at: string | null;
  signature_requests: SignatureRequest[] | null;
}

type AttentionIcon = "alert" | "pen" | "clock" | "check";

interface AttentionAction {
  label: string;
  href: string;
  primary?: boolean;
  download?: boolean;
}

interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: AttentionIcon;
  iconColor: string;
  iconBg: string;
  badge: string;
  badgeColor: string;
  actions: AttentionAction[];
}

const POPULAR_CONTRACT_TYPE_IDS = new Set([
  "nda_mutual",
  "nda_one_way",
  "independent_contractor",
  "consulting_agreement",
  "safe_note",
  "freelance_service",
]);

function formatRelativeFromNow(dateString: string): string {
  const now = Date.now();
  const target = new Date(dateString).getTime();
  const diffMs = now - target;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getDaysUntil(dateString: string): number {
  const now = Date.now();
  const target = new Date(dateString).getTime();
  const diffMs = target - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  // Fetch all contracts for accurate stats
  const { data: allContracts = [] } = await supabase
    .from("contracts")
    .select("id, title, type, jurisdiction, status, updated_at, expires_at, payment_status, payment_amount, payment_currency")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch pending signature contracts with signer state for action feed.
  const { data: pendingContractsData = [] } = await supabase
    .from("contracts")
    .select(`
      id,
      title,
      type,
      updated_at,
      expires_at,
      status,
      signature_requests (
        id,
        signer_name,
        signer_email,
        status
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "pending_signature")
    .order("updated_at", { ascending: false });

  // Calculate stats
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const contracts = (allContracts || []) as Contract[];
  const pendingContracts = (pendingContractsData || []) as PendingContract[];

  const stats = {
    totalContracts: contracts.length,
    pendingSignatures: contracts.filter(c => c.status === "pending_signature").length,
    completedThisMonth: contracts.filter(
      c => c.status === "signed" && new Date(c.updated_at) >= thisMonthStart
    ).length,
  };

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const userEmail = (user.email || "").toLowerCase();
  const expiringContracts = pendingContracts.filter((contract) => {
    if (!contract.expires_at) return false;
    const expiresAt = new Date(contract.expires_at);
    return expiresAt >= now && expiresAt <= sevenDaysFromNow;
  });
  const expiringIds = new Set(expiringContracts.map((contract) => contract.id));

  const yourTurnContracts = pendingContracts.filter((contract) =>
    !expiringIds.has(contract.id) &&
    (contract.signature_requests || []).some(
      (request) =>
        request.status === "pending" &&
        request.signer_email?.toLowerCase() === userEmail
    )
  );
  const yourTurnIds = new Set(yourTurnContracts.map((contract) => contract.id));

  const waitingContracts = pendingContracts.filter((contract) =>
    !expiringIds.has(contract.id) &&
    !yourTurnIds.has(contract.id) &&
    (contract.signature_requests || []).some(
      (request) => request.status === "viewed" || request.status === "pending"
    )
  );

  const completedContracts = contracts.filter(
    (contract) => contract.status === "signed" || contract.status === "completed"
  );

  const attentionItems: AttentionItem[] = [
    ...expiringContracts.slice(0, 2).map((contract) => {
      const pendingSigner = (contract.signature_requests || []).find(
        (request) => request.status === "pending"
      );
      const daysUntilExpiry = contract.expires_at ? getDaysUntil(contract.expires_at) : 0;
      const expiryText =
        daysUntilExpiry <= 0
          ? "today"
          : `in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`;

      return {
        id: contract.id,
        title: contract.title,
        subtitle: `${pendingSigner?.signer_name || "A signer"} hasn't signed · expires ${expiryText}`,
        icon: "alert" as const,
        iconColor: "text-amber-500",
        iconBg: "bg-amber-50",
        badge: "Expires soon",
        badgeColor: "bg-amber-100 text-amber-700",
        actions: [
          {
            label: "Send reminder",
            href: `/contracts/${contract.id}/edit?tab=signatures`,
            primary: true,
          },
          {
            label: "Extend deadline",
            href: `/contracts/${contract.id}/edit?tab=signatures`,
          },
        ],
      };
    }),
    ...yourTurnContracts.slice(0, 2).map((contract) => ({
      id: contract.id,
      title: contract.title,
      subtitle: "Awaiting your signature",
      icon: "pen" as const,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
      badge: "Your turn",
      badgeColor: "bg-blue-100 text-blue-700",
      actions: [
        {
          label: "Sign now",
          href: `/contracts/${contract.id}/edit`,
          primary: true,
        },
      ],
    })),
    ...waitingContracts.slice(0, 2).map((contract) => ({
      id: contract.id,
      title: contract.title,
      subtitle: `Sent ${formatRelativeFromNow(contract.updated_at)} · viewed but not signed`,
      icon: "clock" as const,
      iconColor: "text-slate-400",
      iconBg: "bg-slate-100",
      badge: "Waiting",
      badgeColor: "bg-slate-100 text-slate-600",
      actions: [
        {
          label: "Send reminder",
          href: `/contracts/${contract.id}/edit?tab=signatures`,
          primary: true,
        },
        {
          label: "View contract",
          href: `/contracts/${contract.id}/edit`,
        },
      ],
    })),
    ...completedContracts.slice(0, 2).map((contract) => ({
      id: contract.id,
      title: contract.title,
      subtitle: `Fully signed · ${formatRelativeFromNow(contract.updated_at)}`,
      icon: "check" as const,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      badge: "Complete",
      badgeColor: "bg-emerald-100 text-emerald-700",
      actions: [
        {
          label: "Download PDF",
          href: `/api/contracts/${contract.id}/pdf`,
          primary: true,
          download: true,
        },
      ],
    })),
  ].slice(0, 5);

  const popularContractTypes = Object.values(CONTRACT_TYPES).filter((type) =>
    POPULAR_CONTRACT_TYPE_IDS.has(type.id)
  );

  return (
    <div className="space-y-6">
      {/* Upgrade Banner (slim, dismissible — free users only) */}
      <UpgradeCard />

      {/* Usage Warning (near/at limit) */}
      <UsageWarning />

      {/* Welcome + New Contract CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-slate-500 mt-1">
            Create and manage your legal contracts
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#202e46] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2539] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/contracts"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Contracts</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalContracts}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center group-hover:bg-[#529ec6]/15 transition-colors">
              <FileText className="w-6 h-6 text-[#529ec6]" />
            </div>
          </div>
        </Link>

        <Link
          href="/contracts?status=pending_signature"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Signatures</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.pendingSignatures}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <PenTool className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Link>

        <Link
          href="/contracts?status=signed"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed This Month</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.completedThisMonth}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Attention Feed */}
      {attentionItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">What needs attention</h2>
              <p className="text-sm text-slate-500">Sorted by urgency</p>
            </div>
            <Link
              href="/contracts"
              className="text-sm text-[#529ec6] hover:underline"
            >
              View all contracts
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {attentionItems.map((item) => {
              const Icon =
                item.icon === "alert"
                  ? AlertTriangle
                  : item.icon === "pen"
                    ? PenTool
                    : item.icon === "clock"
                      ? Clock
                      : CheckCircle2;

              return (
                <div key={item.id} className="px-6 py-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.actions.map((action) =>
                      action.download ? (
                        <a
                          key={`${item.id}-${action.label}`}
                          href={action.href}
                          download
                          className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${action.primary
                            ? "bg-[#202e46] text-white hover:bg-[#1a2539]"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          {action.label}
                        </a>
                      ) : (
                        <Link
                          key={`${item.id}-${action.label}`}
                          href={action.href}
                          className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${action.primary
                            ? "bg-[#202e46] text-white hover:bg-[#1a2539]"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          {action.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Contract */}
      <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create a Contract</h2>
          <p className="text-sm text-slate-500 mt-1">
            Start with AI or choose from popular types.
          </p>
        </div>
        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link
              href="/contracts/new?mode=smart"
              className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/50 p-7 hover:bg-slate-50 hover:border-[#529ec6]/30 transition-all duration-300 group"
            >
              <div className="relative flex items-start gap-5">
                <div className="w-12 h-12 rounded-full bg-[#529ec6]/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[#529ec6]/10 transition-all duration-300">
                  <Sparkles className="w-5 h-5 text-[#529ec6]" strokeWidth={1.25} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 group-hover:text-[#202e46] transition-colors">Describe your needs</p>
                  <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed font-medium">Fastest way to generate the right contract. Just type what you need and let AI do the rest.</p>
                </div>
              </div>
            </Link>

            <Link
              href="/contracts/new?mode=template"
              className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-7 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 group"
            >
              <div className="relative flex items-start gap-5">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-all duration-300">
                  <FileStack className="w-5 h-5 text-slate-600" strokeWidth={1.25} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 group-hover:text-slate-700 transition-colors">Start from a template</p>
                  <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed font-medium">Use a proven, standard template and customize it for your specific situation.</p>
                </div>
              </div>
            </Link>
          </div>

          <div>
            <div className="flex items-center gap-4 mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Popular contract types
              </p>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularContractTypes.map((type) => {
                const Icon = CONTRACT_ICONS[type.icon] || FileText;
                return (
                  <Link
                    key={type.id}
                    href={`/contracts/new?mode=manual&type=${type.id}`}
                    className="flex flex-col items-center justify-center p-6 rounded-[20px] border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-300 group"
                  >
                    <div className="mb-4">
                      <Icon className="w-8 h-8 text-slate-400 group-hover:text-[#529ec6] transition-colors duration-300" strokeWidth={1} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 text-center leading-tight group-hover:text-slate-900 transition-colors">
                      {type.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 font-medium text-center uppercase tracking-wider">
                      ~{type.estimatedTime}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center pt-2 pb-2">
            <Link
              href="/contracts/new?mode=manual"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
            >
              <span>Browse all contract types</span>
              <ArrowRight className="w-4 h-4 ml-2 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist (collapsed by default, new users only) */}
      <DashboardChecklistWrapper />

    </div>
  );
}
