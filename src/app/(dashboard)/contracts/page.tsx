import Link from "next/link";
import { FileText, Plus, ArrowRight, DollarSign, Clock, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  updated_at: string;
  created_at: string;
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string;
}

// Payment status badge component
function PaymentBadge({ contract }: { contract: Contract }) {
  if (!contract.payment_required) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const amount = contract.payment_amount
    ? formatCurrency(contract.payment_amount, contract.payment_currency || "usd")
    : "";

  switch (contract.payment_status) {
    case "succeeded":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3" />
          {amount} Paid
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3" />
          {amount} Due
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <DollarSign className="w-3 h-3" />
          Processing
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <DollarSign className="w-3 h-3" />
          {amount}
        </span>
      );
  }
}

export default async function ContractsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all user's contracts with payment info
  const { data: contracts = [] } = await supabase
    .from("contracts")
    .select("id, title, type, jurisdiction, status, updated_at, created_at, payment_required, payment_amount, payment_currency, payment_status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const contractsList = (contracts || []) as Contract[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
          <p className="text-slate-500 mt-1">
            Manage all your contracts in one place
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Link>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {contractsList.length === 0 ? (
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
            {contractsList.map((contract) => (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}/edit`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
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
                <div className="flex items-center gap-3">
                  <PaymentBadge contract={contract} />
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
  );
}
