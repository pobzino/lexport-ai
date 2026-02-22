"use client";

import { useState } from "react";
import { ContractSearch } from "@/components/dashboard/ContractSearch";
import { ContractsList } from "./contracts-list";

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
  deposit_paid?: boolean;
  balance_remaining?: number;
  amount_paid?: number;
  tags?: { id: string; name: string; color: string }[];
}

interface ContractsPageClientProps {
  contracts: Contract[];
}

export function ContractsPageClient({ contracts }: ContractsPageClientProps) {
  const [searchActive, setSearchActive] = useState(false);

  return (
    <div className="space-y-6">
      {/* Advanced Search Component */}
      <ContractSearch onResultsChange={setSearchActive} />

      {/* Regular Contracts List (hidden when search is active) */}
      {!searchActive && <ContractsList contracts={contracts} />}
    </div>
  );
}
