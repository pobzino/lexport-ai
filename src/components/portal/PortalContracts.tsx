"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  Download,
  Eye,
  DollarSign,
  Briefcase,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ContractPreviewModal } from "./ContractPreviewModal";

interface Invoice {
  id: string;
  contract_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  due_date: string | null;
  contract_title?: string;
}

interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  created_at: string;
  contract_title?: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  content?: string;
  created_at: string;
  updated_at: string;
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string;
}

interface SignatureRequest {
  id: string;
  status: string;
  signer_name: string;
  signer_role: string;
  token: string;
  signed_at: string | null;
  contract: Contract;
}

interface PortalContractsProps {
  contracts: SignatureRequest[];
  email: string;
}

function formatContractType(type: string): string {
  const types: Record<string, string> = {
    nda_mutual: "Mutual NDA",
    nda_one_way: "One-Way NDA",
    independent_contractor: "Contractor Agreement",
    consulting_agreement: "Consulting Agreement",
    safe_note: "SAFE Note",
    freelance_service: "Freelance Service Agreement",
  };
  return types[type] || type;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PortalContracts({ contracts, email }: PortalContractsProps) {
  const [previewRequest, setPreviewRequest] = useState<SignatureRequest | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch invoices and payments
  useEffect(() => {
    async function fetchFinancialData() {
      setLoading(true);
      try {
        const response = await fetch("/api/portal/invoices");
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
          setPayments(data.payments || []);
        }
      } catch (error) {
        console.error("Failed to fetch financial data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFinancialData();
  }, []);

  // Group contracts by status
  const pendingAction = contracts.filter(
    (c) => c.status === "pending" && c.contract.status !== "signed"
  );
  const awaitingOthers = contracts.filter(
    (c) => c.status === "signed" && c.contract.status !== "signed"
  );
  const completed = contracts.filter(
    (c) => c.contract.status === "signed" || c.contract.status === "completed"
  );

  const firstName = email.split("@")[0];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">
              Welcome back, {firstName}
            </h1>
            <p className="text-slate-500">
              {pendingAction.length > 0 ? (
                <>
                  You have{" "}
                  <span className="font-medium text-slate-700">
                    {pendingAction.length} contract
                    {pendingAction.length > 1 ? "s" : ""}
                  </span>{" "}
                  requiring your attention
                </>
              ) : (
                "All caught up. No pending actions."
              )}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center">
              <Clock className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900">
                {pendingAction.length}
              </p>
              <p className="text-sm text-slate-500">Awaiting signature</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center">
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900">
                {awaitingOthers.length}
              </p>
              <p className="text-sm text-slate-500">Awaiting others</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900">
                {completed.length}
              </p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Required Section */}
      {pendingAction.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Action Required
          </h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {pendingAction.map((request) => (
              <ContractCard
                key={request.id}
                request={request}
                variant="action"
                onPreview={() => setPreviewRequest(request)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Awaiting Others Section */}
      {awaitingOthers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Awaiting Other Signers
          </h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {awaitingOthers.map((request) => (
              <ContractCard
                key={request.id}
                request={request}
                variant="waiting"
                onPreview={() => setPreviewRequest(request)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Completed
          </h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {completed.map((request) => (
              <ContractCard
                key={request.id}
                request={request}
                variant="completed"
                onPreview={() => setPreviewRequest(request)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Invoices Section */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowInvoices(!showInvoices)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Your Invoices ({invoices.length})
            </h2>
            {showInvoices ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showInvoices && (
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${
                      invoice.status === "paid"
                        ? "bg-emerald-100"
                        : invoice.status === "sent"
                          ? "bg-amber-100"
                          : "bg-slate-100"
                    }`}>
                      <Receipt className={`w-4 h-4 ${
                        invoice.status === "paid"
                          ? "text-emerald-600"
                          : invoice.status === "sent"
                            ? "text-amber-600"
                            : "text-slate-500"
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-sm text-slate-500">
                        {invoice.contract_title || "Contract"} • {formatDate(invoice.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      {invoice.status === "paid" && invoice.paid_at && (
                        <p className="text-xs text-emerald-600">
                          Paid {formatDate(invoice.paid_at)}
                        </p>
                      )}
                      {invoice.status !== "paid" && invoice.due_date && (
                        <p className="text-xs text-amber-600">
                          Due {formatDate(invoice.due_date)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : invoice.status === "sent"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                    <a
                      href={`/api/portal/invoices/${invoice.id}?format=pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium rounded-md transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment History Section */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowPayments(!showPayments)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Payment History ({payments.length})
            </h2>
            {showPayments ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showPayments && (
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${
                      payment.status === "succeeded"
                        ? "bg-emerald-100"
                        : payment.status === "processing"
                          ? "bg-blue-100"
                          : payment.status === "failed"
                            ? "bg-red-100"
                            : "bg-slate-100"
                    }`}>
                      <CreditCard className={`w-4 h-4 ${
                        payment.status === "succeeded"
                          ? "text-emerald-600"
                          : payment.status === "processing"
                            ? "text-blue-600"
                            : payment.status === "failed"
                              ? "text-red-600"
                              : "text-slate-500"
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {payment.payment_type === "deposit"
                          ? "Deposit Payment"
                          : payment.payment_type === "balance"
                            ? "Balance Payment"
                            : "Full Payment"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {payment.contract_title || "Contract"} • {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        payment.status === "succeeded"
                          ? "bg-emerald-100 text-emerald-700"
                          : payment.status === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : payment.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {payment.status === "succeeded"
                        ? "Paid"
                        : payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-medium text-slate-900 mb-1">
            No contracts yet
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            When someone sends you a contract to sign, it will appear here.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewRequest && (
        <ContractPreviewModal
          contract={previewRequest.contract}
          signerName={previewRequest.signer_name}
          signedAt={previewRequest.signed_at}
          onClose={() => setPreviewRequest(null)}
        />
      )}
    </div>
  );
}

// Contract Card Component
function ContractCard({
  request,
  variant,
  onPreview,
}: {
  request: SignatureRequest;
  variant: "action" | "waiting" | "completed";
  onPreview: () => void;
}) {
  const contract = request.contract;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{contract.title}</p>
          <p className="text-sm text-slate-500">
            {formatContractType(contract.type)} • {formatDate(contract.created_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-4">
        {/* Payment Badge */}
        {contract.payment_required && contract.payment_amount && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              contract.payment_status === "succeeded"
                ? "bg-slate-100 text-slate-700"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            <DollarSign className="w-3 h-3" />
            {formatCurrency(contract.payment_amount, contract.payment_currency || "usd")}
            {contract.payment_status === "succeeded" && " Paid"}
          </span>
        )}

        {/* Preview Button (for completed) */}
        {variant === "completed" && (
          <button
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">View</span>
          </button>
        )}

        {/* Action Button */}
        {variant === "action" && (
          <Link
            href={`/sign/${request.token}?returnTo=/portal`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white text-sm font-medium rounded-md hover:bg-[#1a2539] transition-colors"
          >
            <span className="hidden sm:inline">Review &</span> Sign
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        {variant === "waiting" && (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">
            Pending
          </span>
        )}
        {variant === "completed" && (
          <a
            href={`/api/contracts/${contract.id}/pdf`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        )}
      </div>
    </div>
  );
}
