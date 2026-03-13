"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectPayments,
  ConnectPayouts,
  ConnectNotificationBanner,
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js/pure";
import type { StripeConnectInstance } from "@stripe/connect-js";
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
  Settings,
  DollarSign,
  ArrowUpRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/components/onboarding";

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

type ViewMode = "overview" | "account" | "payments" | "payouts";

// Pure utility — moved outside component to avoid recreation on each render
function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
];

export default function PaymentSettingsPage() {
  const searchParams = useSearchParams();
  const { completeStep } = useOnboarding();
  const { confirm } = useConfirmDialog();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [showCountrySelect, setShowCountrySelect] = useState(false);

  // Check for URL params from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Your payment account has been connected successfully!");
      // Mark onboarding step complete
      completeStep("setup_payments");
      window.history.replaceState({}, "", "/settings/payments");
    }
    if (searchParams.get("refresh") === "true") {
      setError("Please complete your account setup to receive payments.");
      window.history.replaceState({}, "", "/settings/payments");
    }
  }, [searchParams, completeStep]);

  // Fetch Connect status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/stripe/connect");
      if (!response.ok) {
        throw new Error("Failed to fetch payment status");
      }
      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err) {
      setError("Failed to load payment settings. Please try again.");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Stripe Connect instance for embedded components
  const initializeStripeConnect = useCallback(async () => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      setError("Stripe is not configured. Please contact support.");
      return;
    }

    // Don't initialize if we already have an instance
    if (stripeConnectInstance) {
      return;
    }

    try {
      const instance = await loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const response = await fetch("/api/stripe/connect/session", {
            method: "POST",
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Account session error:", errorData);
            throw new Error(errorData.error || "Failed to create account session");
          }
          const { clientSecret } = await response.json();
          return clientSecret;
        },
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#529ec6",
            colorBackground: "#ffffff",
            colorText: "#0f172a",
            colorDanger: "#dc2626",
            colorBorder: "#e2e8f0",
            borderRadius: "12px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSizeBase: "14px",
            spacingUnit: "4px",
            buttonPrimaryColorBackground: "#529ec6",
            buttonPrimaryColorText: "#ffffff",
            badgeSuccessColorBackground: "#dcfce7",
            badgeSuccessColorText: "#166534",
            badgeWarningColorBackground: "#fef3c7",
            badgeWarningColorText: "#92400e",
            badgeNeutralColorBackground: "#f1f5f9",
            badgeNeutralColorText: "#475569",
          },
        },
      });
      setStripeConnectInstance(instance);
    } catch (err) {
      console.error("Failed to initialize Stripe Connect:", err);
      setError("Failed to load account setup. Please try again.");
    }
  }, [stripeConnectInstance]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Initialize Stripe Connect when account exists
  useEffect(() => {
    if (status?.connected && status.accountId && !stripeConnectInstance) {
      initializeStripeConnect();
    }
  }, [status, stripeConnectInstance, initializeStripeConnect]);

  // Start Connect onboarding - create account first
  const handleConnect = async (country: string) => {
    try {
      setConnecting(true);
      setError(null);
      setShowCountrySelect(false);
      // Clear any existing instance since we're creating a new account
      setStripeConnectInstance(null);

      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Connect account");
      }

      // Refresh status to get the new account
      // The useEffect will handle initializing the Connect instance
      await fetchStatus();
    } catch (err) {
      setError("Failed to start account setup. Please try again.");
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect account
  const handleDisconnect = async () => {
    const confirmed = await confirm({ title: "Disconnect Payment Account", message: "Are you sure you want to disconnect your payment account? You will not be able to receive payments until you reconnect.", variant: "warning", confirmText: "Disconnect" });
    if (!confirmed) {
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
      setStripeConnectInstance(null);
      setViewMode("overview");
      await fetchStatus();
    } catch (err) {
      setError("Failed to disconnect account. Please try again.");
      console.error(err);
    } finally {
      setDisconnecting(false);
    }
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("account")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
              title="Complete account setup"
            >
              <AlertCircle className="w-4 h-4" />
              Complete Setup
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fetchStatus}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        );
      case "restricted":
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("account")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors cursor-pointer"
              title="Fix account restrictions"
            >
              <XCircle className="w-4 h-4" />
              Fix Issues
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fetchStatus}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
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
          <Link
            href="/settings"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Settings
          </Link>
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
          <Link
            href="/settings"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Settings
          </Link>
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

      {/* Notification Banner for Connected Accounts */}
      {stripeConnectInstance && status?.connected && (
        <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
          <ConnectNotificationBanner />
        </ConnectComponentsProvider>
      )}

      {/* Connect Account Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Only show header when not in onboarding flow */}
        {!(status?.status === "pending" && stripeConnectInstance) && (
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
        )}

        <div className="p-6">
          {!status?.connected ? (
            /* Not Connected State */
            <div className="text-center py-8">
              {!showCountrySelect ? (
                <>
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
                  <Button onClick={() => setShowCountrySelect(true)} disabled={connecting}>
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
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
                </>
              ) : (
                /* Country Selection */
                <div className="max-w-sm mx-auto">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Select Your Country
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Choose where your business is registered to see the correct requirements.
                  </p>
                  <div className="space-y-2 mb-6">
                    {SUPPORTED_COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => setSelectedCountry(country.code)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedCountry === country.code
                            ? "border-brand-600 bg-brand-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-2xl">{country.flag}</span>
                        <span className="font-medium text-slate-900">{country.name}</span>
                        {selectedCountry === country.code && (
                          <CheckCircle2 className="w-5 h-5 text-brand-600 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCountrySelect(false)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => handleConnect(selectedCountry)}
                      disabled={connecting}
                      className="flex-1"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : status.status === "pending" && stripeConnectInstance ? (
            /* Embedded Onboarding State */
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <div className="space-y-4">
                <ConnectAccountOnboarding
                  onExit={() => {
                    fetchStatus();
                  }}
                />
                <div className="pt-4 border-t border-slate-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-slate-500 hover:text-red-600"
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Cancel & Start Over
                  </Button>
                </div>
              </div>
            </ConnectComponentsProvider>
          ) : status.status === "pending" ? (
            /* Fallback for pending without instance */
            <div className="text-center py-8">
              {error ? (
                <>
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-slate-600 mb-4">
                    Could not load account setup. Please try again.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setError(null);
                        initializeStripeConnect();
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel & Start Over
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading account setup...</p>
                </>
              )}
            </div>
          ) : stripeConnectInstance ? (
            /* Connected State with Embedded Management */
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <div className="space-y-6">
                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b border-slate-200 -mx-6 px-6">
                  <button
                    onClick={() => setViewMode("overview")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      viewMode === "overview"
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setViewMode("account")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      viewMode === "account"
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-1.5" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => setViewMode("payments")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      viewMode === "payments"
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 inline mr-1.5" />
                    Payments
                  </button>
                  <button
                    onClick={() => setViewMode("payouts")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      viewMode === "payouts"
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 inline mr-1.5" />
                    Payouts
                  </button>
                </div>

                {/* Tab Content */}
                {viewMode === "overview" && (
                  <div className="space-y-6">
                    {/* Account Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`rounded-lg p-4 ${status.chargesEnabled ? "bg-green-50" : "bg-slate-50"}`}>
                        <div className={`flex items-center gap-2 text-sm mb-1 ${status.chargesEnabled ? "text-green-700" : "text-slate-600"}`}>
                          <CheckCircle2 className="w-4 h-4" />
                          Payments
                        </div>
                        <p className={`text-lg font-semibold ${status.chargesEnabled ? "text-green-900" : "text-slate-900"}`}>
                          {status.chargesEnabled ? "Enabled" : "Disabled"}
                        </p>
                        {!status.chargesEnabled && (
                          <p className="text-xs text-slate-500 mt-1">Complete setup to enable</p>
                        )}
                      </div>
                      <div className={`rounded-lg p-4 ${status.payoutsEnabled ? "bg-green-50" : "bg-slate-50"}`}>
                        <div className={`flex items-center gap-2 text-sm mb-1 ${status.payoutsEnabled ? "text-green-700" : "text-slate-600"}`}>
                          <Wallet className="w-4 h-4" />
                          Payouts
                        </div>
                        <p className={`text-lg font-semibold ${status.payoutsEnabled ? "text-green-900" : "text-slate-900"}`}>
                          {status.payoutsEnabled ? "Enabled" : "Disabled"}
                        </p>
                        {!status.payoutsEnabled && (
                          <p className="text-xs text-slate-500 mt-1">Complete setup to enable</p>
                        )}
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
                    {status.status === "restricted" && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-red-800">
                              Action Required
                            </h4>
                            <p className="text-sm text-red-700 mt-1">
                              Your account has restrictions that prevent you from receiving payments.
                              Update your information to resolve this.
                            </p>
                            <button
                              onClick={() => setViewMode("account")}
                              className="inline-flex items-center gap-1.5 text-sm font-medium mt-3 px-3 py-1.5 rounded-md bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Go to Account Settings
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-3 border-t border-slate-200 pt-6">
                      <Button
                        onClick={() => setViewMode("account")}
                        variant={status.status === "restricted" ? "default" : "outline"}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {status.status === "restricted"
                          ? "Fix Account Issues"
                          : "Manage Account"}
                      </Button>
                      {status.dashboardUrl && (
                        <Button variant="outline" asChild>
                          <a href={status.dashboardUrl} target="_blank" rel="noopener noreferrer">
                            Open Stripe Dashboard
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {disconnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {viewMode === "account" && (
                  <div className="bg-slate-50 rounded-xl p-6 -mx-6 -mb-6">
                    <p className="text-sm text-slate-500 mb-4">
                      Account settings are managed by Stripe. You may need to sign in to your Stripe account to view or edit details.
                    </p>
                    <ConnectAccountManagement />
                  </div>
                )}

                {viewMode === "payments" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">Payment History</h3>
                        <p className="text-sm text-slate-500">View all payments received through your contracts</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 -mx-6 -mb-6 min-h-[300px]">
                      <ConnectPayments />
                    </div>
                  </div>
                )}

                {viewMode === "payouts" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">Payout History</h3>
                        <p className="text-sm text-slate-500">Track payouts to your connected bank account</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 -mx-6 -mb-6 min-h-[300px]">
                      <ConnectPayouts />
                    </div>
                  </div>
                )}
              </div>
            </ConnectComponentsProvider>
          ) : (
            /* Fallback loading state */
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading payment components...</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods Info - hide during onboarding */}
      {!(status?.status === "pending" && stripeConnectInstance) && (
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
      )}

    </div>
  );
}
