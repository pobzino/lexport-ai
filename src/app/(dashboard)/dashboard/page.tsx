import Link from "next/link";
import { FileText, PenTool, Clock, Plus, ArrowRight, Shield, Briefcase, Users, TrendingUp, Edit, DollarSign, Receipt, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_TYPES } from "@/lib/contracts/schemas";

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

interface Invoice {
  id: string;
  contract_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  recipient_name: string | null;
  created_at: string;
  paid_at: string | null;
}

// Format currency helper
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
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

  // Fetch user's contracts using Supabase client
  const { data: userContracts = [] } = await supabase
    .from("contracts")
    .select("id, title, type, jurisdiction, status, updated_at, payment_status, payment_amount, payment_currency")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  // Fetch user's invoices
  const { data: userInvoices = [] } = await supabase
    .from("invoices")
    .select("id, contract_id, invoice_number, amount, currency, status, recipient_name, created_at, paid_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch all invoices for stats (without limit)
  const { data: allInvoices = [] } = await supabase
    .from("invoices")
    .select("id, amount, currency, status")
    .eq("user_id", user.id);

  // Calculate stats
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const contracts = (userContracts || []) as Contract[];
  const invoices = (userInvoices || []) as Invoice[];
  const allInvoicesList = (allInvoices || []) as { id: string; amount: number; currency: string; status: string }[];

  // Invoice stats (assuming USD for simplicity, convert if needed)
  const totalInvoiced = allInvoicesList.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = allInvoicesList.filter(inv => inv.status === "paid");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingInvoices = allInvoicesList.filter(inv => inv.status === "sent" || inv.status === "draft");
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const stats = {
    totalContracts: contracts.length,
    pendingSignatures: contracts.filter(c => c.status === "pending_signature").length,
    completedThisMonth: contracts.filter(
      c => c.status === "signed" && new Date(c.updated_at) >= thisMonthStart
    ).length,
    // Invoice stats
    totalInvoiced,
    totalPaid,
    totalPending,
    invoiceCount: allInvoicesList.length,
    paidCount: paidInvoices.length,
    pendingCount: pendingInvoices.length,
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
            <div className="w-12 h-12 bg-violet-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-violet-600" />
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

      {/* Invoice Stats */}
      {stats.invoiceCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Invoiced</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats.totalInvoiced, "usd")}
                </p>
                <p className="text-xs text-slate-400 mt-1">{stats.invoiceCount} invoices</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Paid</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stats.totalPaid, "usd")}
                </p>
                <p className="text-xs text-slate-400 mt-1">{stats.paidCount} paid</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.totalPending, "usd")}
                </p>
                <p className="text-xs text-slate-400 mt-1">{stats.pendingCount} pending</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

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
                  className="flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-violet-200 transition-colors">
                    <Icon className="w-5 h-5 text-violet-600" />
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

      {/* Recent Contracts */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Contracts</h2>
            <p className="text-sm text-slate-500">
              Your most recently created or modified contracts
            </p>
          </div>
          {contracts.length > 0 && (
            <Link
              href="/contracts"
              className="text-sm text-violet-600 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="p-6">
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No contracts yet
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Create your first contract using our AI-powered generator.
              </p>
              <Link
                href="/contracts/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Contract
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contracts/${contract.id}/edit`}
                  className="flex items-center justify-between py-4 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{contract.title}</p>
                      <p className="text-sm text-slate-500">
                        {contract.type} • {contract.jurisdiction}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contract.status === "draft"
                          ? "bg-slate-100 text-slate-600"
                          : contract.status === "pending_signature"
                            ? "bg-amber-100 text-amber-700"
                            : contract.status === "signed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {contract.status === "pending_signature"
                        ? "Pending"
                        : contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(contract.updated_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Invoices</h2>
              <p className="text-sm text-slate-500">
                Your most recent invoices
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      invoice.status === "paid"
                        ? "bg-emerald-100"
                        : invoice.status === "sent"
                          ? "bg-amber-100"
                          : "bg-slate-100"
                    }`}>
                      <Receipt className={`w-5 h-5 ${
                        invoice.status === "paid"
                          ? "text-emerald-600"
                          : invoice.status === "sent"
                            ? "text-amber-600"
                            : "text-slate-600"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">
                        {invoice.recipient_name || "No recipient"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : invoice.status === "sent"
                            ? "bg-amber-100 text-amber-700"
                            : invoice.status === "void"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                    <a
                      href={`/api/invoices/${invoice.id}?format=pdf`}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
