"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  CreditCard,
  Building2,
  AlertCircle,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  payment_method: string | null;
  payer_name: string | null;
  payer_email: string | null;
  created_at: string;
  contract_title?: string;
}

interface ConnectStatus {
  connected: boolean;
  status: "not_connected" | "pending" | "active" | "restricted";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  } | null;
  dashboardUrl: string | null;
}

interface PaymentStats {
  totalCollected: number;
  thisMonthCollected: number;
  pendingPayments: number;
  pendingAmount: number;
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalCollected: 0,
    thisMonthCollected: 0,
    pendingPayments: 0,
    pendingAmount: 0,
  });

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Connect status
      const connectResponse = await fetch("/api/stripe/connect");
      if (connectResponse.ok) {
        const connectData = await connectResponse.json();
        setConnectStatus(connectData);
      }

      // Fetch payments
      const paymentsResponse = await fetch("/api/payments");
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.payments || []);
        setStats(
          paymentsData.stats || {
            totalCollected: 0,
            thisMonthCollected: 0,
            pendingPayments: 0,
            pendingAmount: 0,
          }
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency
  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Get payment status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 animate-spin" />
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
      case "refunded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1">
            Track payments and manage your earnings
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1">
            Track payments and manage your earnings
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Connect Account Banner */}
      {!connectStatus?.connected && (
        <div className="bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Connect Your Bank Account
              </h3>
              <p className="text-slate-600 mt-1">
                Set up Stripe Connect to receive payments from your contracts
                directly to your bank account.
              </p>
              <Link href="/settings/payments">
                <Button className="mt-4">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Account Status Warning */}
      {connectStatus?.connected && connectStatus.status === "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">
              Complete your account setup
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Your payment account needs additional information before you can
              receive payouts.
            </p>
            <Link href="/settings/payments">
              <Button variant="outline" size="sm" className="mt-2">
                Continue Setup
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Collected</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.totalCollected)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.thisMonthCollected)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Awaiting Payment</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.pendingAmount)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {stats.pendingPayments} {stats.pendingPayments === 1 ? "contract" : "contracts"}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Available Balance */}
        {connectStatus?.connected && connectStatus.balance && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Available Balance</p>
                <p className="text-3xl font-bold text-slate-900">
                  {connectStatus.balance.available.length > 0
                    ? formatCurrency(
                        connectStatus.balance.available[0].amount,
                        connectStatus.balance.available[0].currency
                      )
                    : "$0.00"}
                </p>
                {connectStatus.dashboardUrl && (
                  <a
                    href={connectStatus.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    View in Stripe
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="w-12 h-12 bg-violet-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Payments
            </h2>
            <p className="text-sm text-slate-500">
              Payment activity across your contracts
            </p>
          </div>
        </div>
        <div className="p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No payments yet
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                When you collect payments on your contracts, they&apos;ll appear
                here.
              </p>
              <Link href="/contracts">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View Contracts
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {payments.slice(0, 10).map((payment) => (
                <Link
                  key={payment.id}
                  href={`/contracts/${payment.contract_id}/edit`}
                  className="flex items-center justify-between py-4 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {payment.contract_title || "Contract Payment"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {payment.payer_name || payment.payer_email || "Unknown"}
                        {payment.payment_method && (
                          <span className="ml-2 capitalize">
                            via {payment.payment_method.replace("_", " ")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(payment.status)}
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
