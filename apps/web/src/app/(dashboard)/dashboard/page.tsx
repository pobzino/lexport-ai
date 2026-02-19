import Link from "next/link";
import { FileText, PenTool, Clock, Plus, Shield, Briefcase, Users, TrendingUp, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_TYPES } from "@/lib/contracts/schemas";
import { DashboardChecklistWrapper } from "@/components/onboarding";
import { ExpiringContracts } from "@/components/dashboard/ExpiringContracts";
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
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
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
    .select("id, title, type, jurisdiction, status, updated_at, payment_status, payment_amount, payment_currency")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch expiring contracts (pending_signature with expires_at within 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data: expiringContractsData = [] } = await supabase
    .from("contracts")
    .select(`
      id,
      title,
      type,
      expires_at,
      status,
      signature_requests!inner (
        id,
        signer_name,
        signer_email,
        token,
        status
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "pending_signature")
    .not("expires_at", "is", null)
    .lte("expires_at", sevenDaysFromNow.toISOString())
    .gte("expires_at", new Date().toISOString());

  // Transform to ExpiringContract format
  const expiringContracts = (expiringContractsData || []).map((c: {
    id: string;
    title: string;
    type: string;
    expires_at: string;
    status: string;
    signature_requests: { id: string; signer_name: string; signer_email: string; token: string; status: string }[]
  }) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    expires_at: c.expires_at,
    status: c.status,
    pending_signers: (c.signature_requests || [])
      .filter((sr: { status: string }) => sr.status === "pending")
      .map((sr: { id: string; signer_name: string; signer_email: string; token: string }) => ({
        id: sr.id,
        signer_name: sr.signer_name,
        signer_email: sr.signer_email,
        token: sr.token,
      })),
  }));

  // Calculate stats
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const contracts = (allContracts || []) as Contract[];

  const stats = {
    totalContracts: contracts.length,
    pendingSignatures: contracts.filter(c => c.status === "pending_signature").length,
    completedThisMonth: contracts.filter(
      c => c.status === "signed" && new Date(c.updated_at) >= thisMonthStart
    ).length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">
          Create and manage your legal contracts
        </p>
      </div>

      {/* Upgrade Card (for free users) */}
      <UpgradeCard />

      {/* Usage Warning (when near limits) */}
      <UsageWarning />

      {/* Onboarding Checklist */}
      <DashboardChecklistWrapper />

      {/* Expiring Contracts Alert */}
      <ExpiringContracts contracts={expiringContracts} />

      {/* Contract Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Contracts</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalContracts}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#529ec6]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Signatures</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.pendingSignatures}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <PenTool className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed This Month</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.completedThisMonth}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Create a Contract</h2>
          <p className="text-sm text-slate-500">
            Choose a contract type to get started with AI-powered generation
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.values(CONTRACT_TYPES).map((type) => {
              const Icon = CONTRACT_ICONS[type.icon] || FileText;
              return (
                <Link
                  key={type.id}
                  href={`/contracts/new?type=${type.id}`}
                  className="flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:border-[#529ec6]/30 hover:bg-[#529ec6]/5 transition-all group"
                >
                  <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#529ec6]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#529ec6]" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 text-center">
                    {type.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ~{type.estimatedTime}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <Link
              href="/contracts/new"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              View All Contract Types
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
