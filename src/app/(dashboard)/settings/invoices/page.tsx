"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Receipt,
  Building2,
  Hash,
  Calendar,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InvoiceSettings {
  user_id: string;
  number_prefix: string;
  next_number: number;
  company_name: string | null;
  company_address: string | null;
  company_logo_url: string | null;
  default_due_days: number;
  default_notes: string | null;
  default_payment_terms: string | null;
}

const PAYMENT_TERM_OPTIONS = [
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "Net 7", label: "Net 7 (7 days)" },
  { value: "Net 15", label: "Net 15 (15 days)" },
  { value: "Net 30", label: "Net 30 (30 days)" },
  { value: "Net 45", label: "Net 45 (45 days)" },
  { value: "Net 60", label: "Net 60 (60 days)" },
  { value: "Net 90", label: "Net 90 (90 days)" },
];

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<InvoiceSettings>({
    user_id: "",
    number_prefix: "INV-",
    next_number: 1,
    company_name: null,
    company_address: null,
    company_logo_url: null,
    default_due_days: 30,
    default_notes: null,
    default_payment_terms: "Net 30",
  });

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const response = await fetch("/api/invoices/settings");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        setSettings(data.settings);
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError("Failed to load invoice settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Save settings
  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/invoices/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number_prefix: settings.number_prefix,
          company_name: settings.company_name,
          company_address: settings.company_address,
          company_logo_url: settings.company_logo_url,
          default_due_days: settings.default_due_days,
          default_notes: settings.default_notes,
          default_payment_terms: settings.default_payment_terms,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      const data = await response.json();
      setSettings(data.settings);
      setSuccess("Settings saved successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  // Update due days when payment terms change
  function handlePaymentTermsChange(terms: string) {
    setSettings({ ...settings, default_payment_terms: terms });

    // Auto-update due days based on term
    const match = terms.match(/Net (\d+)/);
    if (match) {
      setSettings((prev) => ({
        ...prev,
        default_payment_terms: terms,
        default_due_days: parseInt(match[1]),
      }));
    } else if (terms === "Due on Receipt") {
      setSettings((prev) => ({
        ...prev,
        default_payment_terms: terms,
        default_due_days: 0,
      }));
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Invoice Settings
            </h1>
            <p className="text-slate-500 mt-1">
              Configure invoice numbering and defaults
            </p>
          </div>
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
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Invoice Settings
            </h1>
            <p className="text-slate-500 mt-1">
              Configure invoice numbering and defaults
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invoice Numbering */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
            <Hash className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Invoice Numbering
            </h2>
            <p className="text-sm text-slate-500">
              Configure how invoice numbers are generated
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Number Prefix
            </label>
            <input
              type="text"
              value={settings.number_prefix}
              onChange={(e) =>
                setSettings({ ...settings, number_prefix: e.target.value })
              }
              placeholder="INV-"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Prefix added before the number (e.g., INV-, LEX-)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Next Invoice Number
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.next_number}
                readOnly
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
              />
              <span className="text-sm text-slate-500">
                Preview:{" "}
                <span className="font-mono font-medium text-slate-900">
                  {settings.number_prefix}
                  {String(settings.next_number).padStart(5, "0")}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automatically increments when creating invoices
            </p>
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Company Information
            </h2>
            <p className="text-sm text-slate-500">
              Details shown on your invoices
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={settings.company_name || ""}
                onChange={(e) =>
                  setSettings({ ...settings, company_name: e.target.value })
                }
                placeholder="Your Company Name"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company Logo URL
              </label>
              <input
                type="url"
                value={settings.company_logo_url || ""}
                onChange={(e) =>
                  setSettings({ ...settings, company_logo_url: e.target.value })
                }
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Direct URL to your logo image (PNG or JPG recommended)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Address
            </label>
            <textarea
              value={settings.company_address || ""}
              onChange={(e) =>
                setSettings({ ...settings, company_address: e.target.value })
              }
              placeholder="123 Business St&#10;Suite 100&#10;City, State 12345"
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          {settings.company_logo_url && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo Preview
              </label>
              <div className="w-32 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                <img
                  src={settings.company_logo_url}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden"
                    );
                  }}
                />
                <span className="hidden text-xs text-slate-400">
                  Failed to load
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Terms */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Default Payment Terms
            </h2>
            <p className="text-sm text-slate-500">
              Default terms applied to new invoices
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Payment Terms
            </label>
            <select
              value={settings.default_payment_terms || "Net 30"}
              onChange={(e) => handlePaymentTermsChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              {PAYMENT_TERM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Due Days
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={settings.default_due_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_due_days: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Number of days until invoice is due
            </p>
          </div>
        </div>
      </div>

      {/* Default Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Default Notes
            </h2>
            <p className="text-sm text-slate-500">
              Standard text shown on all invoices
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Invoice Notes
          </label>
          <textarea
            value={settings.default_notes || ""}
            onChange={(e) =>
              setSettings({ ...settings, default_notes: e.target.value })
            }
            placeholder="Thank you for your business! Payment is due within the specified terms."
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            This text will appear at the bottom of all invoices
          </p>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-900">Invoice Preview</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Your next invoice will be generated as:
        </p>
        <div className="bg-white rounded-lg border border-slate-200 p-6 max-w-md">
          <div className="flex items-start justify-between">
            {settings.company_logo_url ? (
              <img
                src={settings.company_logo_url}
                alt="Logo"
                className="h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                <Image className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-slate-500">Invoice Number</p>
              <p className="font-mono font-bold text-brand-600">
                {settings.number_prefix}
                {String(settings.next_number).padStart(5, "0")}
              </p>
            </div>
          </div>
          {settings.company_name && (
            <div className="mt-4">
              <p className="font-semibold text-slate-900">
                {settings.company_name}
              </p>
              {settings.company_address && (
                <p className="text-xs text-slate-500 whitespace-pre-line">
                  {settings.company_address}
                </p>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Payment Terms:{" "}
              <span className="text-slate-700">
                {settings.default_payment_terms}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
