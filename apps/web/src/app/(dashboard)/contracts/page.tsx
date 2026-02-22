import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContractsPageClient } from "./contracts-page-client";

interface Payment {
  contract_id: string;
  payment_type: string;
  status: string;
  amount: number;
}

interface ContractTag {
  tags: {
    id: string;
    name: string;
    color: string;
  };
}

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
  payment_structure: string | null;
  deposit_percentage: number | null;
  folder_id?: string | null;
  contract_tags?: ContractTag[];
  source_type?: "generated" | "uploaded";
  // Computed fields
  deposit_paid?: boolean;
  balance_remaining?: number;
  amount_paid?: number;
  tags?: { id: string; name: string; color: string }[];
}

export default async function ContractsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all user's contracts with payment info and tags
  const { data: contracts = [] } = await supabase
    .from("contracts")
    .select("id, title, type, jurisdiction, status, updated_at, created_at, payment_required, payment_amount, payment_currency, payment_status, payment_structure, deposit_percentage, folder_id, source_type, contract_tags(tags(id, name, color))")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch all successful payments for these contracts
  const contractIds = (contracts || []).map(c => c.id);
  const { data: payments = [] } = await supabase
    .from("payments")
    .select("contract_id, payment_type, status, amount")
    .in("contract_id", contractIds)
    .eq("status", "succeeded");

  // Calculate payment details for each contract
  const contractsList = (contracts || []).map(contract => {
    const contractPayments = (payments || []).filter(p => p.contract_id === contract.id) as Payment[];
    const depositPaid = contractPayments.some(p => p.payment_type === "deposit");
    const balancePaid = contractPayments.some(p => p.payment_type === "balance");
    const fullPaid = contractPayments.some(p => p.payment_type === "full");

    // Calculate amounts
    const totalAmount = Math.round((contract.payment_amount || 0) * 100); // in cents
    const depositPercentage = contract.deposit_percentage || 30;
    const depositAmount = Math.round(totalAmount * (depositPercentage / 100));
    const balanceAmount = totalAmount - depositAmount;

    // Calculate amount paid and remaining
    let amountPaid = 0;
    let balanceRemaining = totalAmount;

    if (fullPaid) {
      amountPaid = totalAmount;
      balanceRemaining = 0;
    } else if (contract.payment_structure === "deposit_balance") {
      if (depositPaid && balancePaid) {
        amountPaid = totalAmount;
        balanceRemaining = 0;
      } else if (depositPaid) {
        amountPaid = depositAmount;
        balanceRemaining = balanceAmount;
      }
    }

    // Flatten tags from contract_tags junction table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags = (contract.contract_tags || []).map((ct: any) => ct.tags).filter(Boolean);

    return {
      ...contract,
      deposit_paid: depositPaid,
      balance_remaining: balanceRemaining / 100, // Convert back to dollars
      amount_paid: amountPaid / 100, // Convert back to dollars
      tags,
    } as unknown as Contract;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Contracts</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Manage all your contracts in one place
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/contracts/upload"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Contract</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Contracts List with Advanced Search & Filter */}
      <ContractsPageClient contracts={contractsList} />
    </div>
  );
}

