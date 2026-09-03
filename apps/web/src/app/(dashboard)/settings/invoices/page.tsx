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
  Landmark,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { InvoiceBankDetails } from "@/lib/invoices/bank-details";

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
  bank_details: InvoiceBankDetails | null;
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
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
    bank_details: null,
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
          bank_details: settings.bank_details,
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

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return;

    try {
      setUploadingLogo(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/invoices/settings/logo", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload logo");
      }

      setSettings((current) => ({
        ...current,
        company_logo_url: data.logoUrl,
      }));
      setSuccess("Logo uploaded and saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    if (!window.confirm("Remove this logo from future contracts and invoices?")) {
      return;
    }

    try {
      setRemovingLogo(true);
      setError(null);
      setSuccess(null);
      const response = await fetch("/api/invoices/settings/logo", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove logo");
      }

      setSettings((current) => ({ ...current, company_logo_url: null }));
      setSuccess("Logo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setRemovingLogo(false);
    }
  }

  function updateBankDetail(
    field: keyof InvoiceBankDetails,
    value: string
  ) {
    setSettings((current) => ({
      ...current,
      bank_details: {
        ...(current.bank_details || {}),
        [field]: value,
      },
    }));
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
              Document & Invoice Settings
            </h1>
            <p className="text-slate-500 mt-1">
              Configure company identity, legal documents, and invoice defaults
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
              Document & Invoice Settings
            </h1>
            <p className="text-slate-500 mt-1">
              Configure company identity, legal documents, and invoice defaults
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
          <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#529ec6]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Company Identity
            </h2>
            <p className="text-sm text-slate-500">
              Used on generated contracts and invoices. Uploaded documents keep their original branding.
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
                Company Logo
              </label>
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-3">
                <div className="flex h-14 w-28 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                  {settings.company_logo_url ? (
                    <img
                      src={settings.company_logo_url}
                      alt="Company logo"
                      className="max-h-12 max-w-24 object-contain"
                    />
                  ) : (
                    <Image className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <label
                      htmlFor="company-logo-upload"
                      className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 ${uploadingLogo ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {settings.company_logo_url ? "Replace logo" : "Upload logo"}
                    </label>
                    <input
                      id="company-logo-upload"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      disabled={uploadingLogo || removingLogo}
                      onChange={(event) => {
                        void handleLogoUpload(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    {settings.company_logo_url && (
                      <button
                        type="button"
                        onClick={() => void handleLogoRemove()}
                        disabled={uploadingLogo || removingLogo}
                        className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {removingLogo ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    PNG or JPG, up to 2 MB. Kept restrained on legal documents.
                  </p>
                </div>
              </div>
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

        </div>
      </div>

      {/* Bank Transfer Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
            <Landmark className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Bank Transfer
            </h2>
            <p className="text-sm text-slate-500">
              Offer bank transfer on invoices and contract payment stages
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {([
            ["account_name", "Account Holder", "Name on the account"],
            ["bank_name", "Bank Name", "Bank name"],
            ["account_number", "Account Number", "12345678"],
            ["sort_code", "Sort Code", "00-00-00"],
            ["routing_number", "Routing Number", "For US transfers"],
            ["iban", "IBAN", "International bank account number"],
            ["swift_bic", "SWIFT / BIC", "International bank identifier"],
            ["reference", "Default Reference", "Optional; invoice number used if blank"],
          ] as Array<[keyof InvoiceBankDetails, string, string]>).map(
            ([field, label, placeholder]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {label}
                </label>
                <input
                  type="text"
                  value={settings.bank_details?.[field] || ""}
                  onChange={(event) => updateBankDetail(field, event.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            )
          )}
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Transfer Instructions
          </label>
          <textarea
            value={settings.bank_details?.instructions || ""}
            onChange={(event) => updateBankDetail("instructions", event.target.value)}
            placeholder="Optional instructions shown to the payer"
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-slate-500 mt-2">
            Bank transfer is shown only after at least one detail is saved. Transfers stay unpaid until you confirm receipt.
          </p>
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
