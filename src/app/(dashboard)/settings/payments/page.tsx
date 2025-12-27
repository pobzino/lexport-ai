"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectStatus {
  connected: boolean;
  status: "not_connected" | "pending" | "active" | "restricted";
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    pastDue: string[];
    eventuallyDue: string[];
  } | null;
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  } | null;
  dashboardUrl: string | null;
  payoutSchedule?: {
    interval: string;
    delay_days?: number;
  };
}

export default function PaymentSettingsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for URL params from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Your payment account has been connected successfully!");
      // Clear the URL params
      window.history.replaceState({}, "", "/settings/payments");
    }
    if (searchParams.get("refresh") === "true") {
      // User needs to continue onboarding
      setError("Please complete your account setup to receive payments.");
      window.history.replaceState({}, "", "/settings/payments");
    }
  }, [searchParams]);

  // Fetch Connect status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/stripe/connect");
      if (!response.ok) {
        throw new Error("Failed to fetch payment status");
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError("Failed to load payment settings. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Start Connect onboarding
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "US" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Connect account");
      }

      const data = await response.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setError("Failed to start account setup. Please try again.");
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  // Continue onboarding
  const handleContinueOnboarding = async () => {
    await handleConnect();
  };

  // Disconnect account
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your payment account? You will not be able to receive payments until you reconnect.")) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);
      const response = await fetch("/api/stripe/connect", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect account");
      }

      setSuccessMessage("Payment account disconnected.");
      await fetchStatus();
    } catch (err) {
      setError("Failed to disconnect account. Please try again.");
      console.error(err);
    } finally {
      setDisconnecting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!status) return null;

    switch (status.status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-4 h-4" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
            <AlertCircle className="w-4 h-4" />
            Pending Setup
          </span>
        );
      case "restricted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            Restricted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
            Not Connected
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Settings</h1>
          <p className="text-slate-500 mt-1">
            Manage how you receive payments from contracts
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
          <h1 className="text-2xl font-bold text-slate-900">Payment Settings</h1>
          <p className="text-slate-500 mt-1">
            Manage how you receive payments from contracts
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Connect Account Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Payment Account
                </h2>
                <p className="text-sm text-slate-500">
                  Connect your bank account to receive payments
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        <div className="p-6">
          {!status?.connected ? (
            /* Not Connected State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Start Accepting Payments
              </h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                Connect your bank account to receive payments from signed contracts.
                We use Stripe for secure payment processing.
              </p>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Connect Bank Account
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-4">
                Powered by Stripe. Your banking details are never stored on our servers.
              </p>
            </div>
          ) : status.status === "pending" ? (
            /* Pending Setup State */
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">
                      Complete Your Account Setup
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Please complete your account verification to start receiving payments.
                    </p>
                  </div>
                </div>
              </div>

              {status.requirements && status.requirements.currentlyDue.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Required Information:
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                    {status.requirements.currentlyDue.map((req) => (
                      <li key={req}>{req.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleContinueOnboarding} disabled={connecting}>
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Continue Setup
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-6">
              {/* Account Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Payments
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {status.chargesEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <Wallet className="w-4 h-4" />
                    Payouts
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {status.payoutsEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <Building2 className="w-4 h-4" />
                    Payout Schedule
                  </div>
                  <p className="text-lg font-semibold text-slate-900 capitalize">
                    {status.payoutSchedule?.interval || "Daily"}
                  </p>
                </div>
              </div>

              {/* Balance */}
              {status.balance && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-4">
                    Account Balance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700 mb-1">Available</p>
                      <p className="text-2xl font-bold text-green-900">
                        {status.balance.available.length > 0
                          ? formatCurrency(
                              status.balance.available[0].amount,
                              status.balance.available[0].currency
                            )
                          : "$0.00"}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700 mb-1">Pending</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {status.balance.pending.length > 0
                          ? formatCurrency(
                              status.balance.pending[0].amount,
                              status.balance.pending[0].currency
                            )
                          : "$0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Restricted Account Warning */}
              {status.status === "restricted" && status.requirements && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">
                        Action Required
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        Your account has restrictions. Please update your information
                        to continue receiving payments.
                      </p>
                      {status.requirements.pastDue.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-red-800">Past due:</p>
                          <ul className="list-disc list-inside text-sm text-red-700">
                            {status.requirements.pastDue.map((req) => (
                              <li key={req}>{req.replace(/_/g, " ")}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 border-t border-slate-200 pt-6">
                {status.dashboardUrl && (
                  <Button asChild>
                    <a href={status.dashboardUrl} target="_blank" rel="noopener noreferrer">
                      Open Stripe Dashboard
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Disconnect Account"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Accepted Payment Methods
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          When you collect payments on contracts, your clients can pay using:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CreditCard className="w-4 h-4 text-slate-400" />
            Credit/Debit Cards
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Building2 className="w-4 h-4 text-slate-400" />
            Bank Transfers (ACH)
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Wallet className="w-4 h-4 text-slate-400" />
            Apple Pay / Google Pay
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CreditCard className="w-4 h-4 text-slate-400" />
            Klarna / Afterpay
          </div>
        </div>
      </div>

      {/* Platform Fee Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Platform Fee
        </h2>
        <p className="text-sm text-slate-600">
          Lexport charges a <strong>1% platform fee</strong> on all payments collected
          through contracts. This is in addition to Stripe&apos;s standard processing
          fees (typically 2.9% + $0.30 for cards).
        </p>
      </div>
    </div>
  );
}
