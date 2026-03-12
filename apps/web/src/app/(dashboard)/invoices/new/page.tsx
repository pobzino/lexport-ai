"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  FileText,
  User,
  List,
  Eye,
  Send,
  Save,
  Building2,
  Settings,
} from "lucide-react";
import { InvoiceTemplateSelector } from "@/components/invoice-template-selector";
import {
  InvoiceLineItemsEditor,
  QuickLineItemPresets,
  useLineItems,
} from "@/components/invoice-line-items-editor";
import type { InvoiceTemplate, InvoiceLineItem } from "@/db/types";

interface InvoiceSettings {
  company_name: string | null;
  company_address: string | null;
  company_logo_url: string | null;
  default_due_days: number;
  default_notes: string | null;
}

// Step configuration
const STEPS = [
  { id: 1, name: "Template", description: "Choose a template", icon: FileText },
  { id: 2, name: "Client", description: "Recipient details", icon: User },
  { id: 3, name: "Items", description: "Line items", icon: List },
  { id: 4, name: "Review", description: "Review & send", icon: Eye },
];

const CURRENCY_OPTIONS = [
  { value: "usd", label: "USD ($)", symbol: "$" },
  { value: "eur", label: "EUR (€)", symbol: "€" },
  { value: "gbp", label: "GBP (£)", symbol: "£" },
];

function formatCurrency(amount: number, currency: string): string {
  const opt = CURRENCY_OPTIONS.find((c) => c.value === currency);
  const symbol = opt?.symbol || "$";
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get("contract_id");

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Sender details (from settings, can be overridden)
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderLogoUrl, setSenderLogoUrl] = useState("");

  // Form state
  const [selectedTemplate, setSelectedTemplate] =
    useState<InvoiceTemplate | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // Contact autocomplete for recipient
  const [contactSuggestions, setContactSuggestions] = useState<Array<{ id: string; name: string; email: string; company?: string }>>([]);
  const [activeRecipientField, setActiveRecipientField] = useState<"name" | "email" | null>(null);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-sync contacts on mount
    fetch("/api/contacts/sync", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(e.target as Node)) {
        setActiveRecipientField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchContactSuggestions = useCallback(async (search: string) => {
    try {
      const params = search ? `search=${encodeURIComponent(search)}&limit=5` : "limit=5";
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContactSuggestions(data.contacts || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!activeRecipientField) return;
    const timer = setTimeout(() => fetchContactSuggestions(recipientSearchTerm), recipientSearchTerm ? 250 : 0);
    return () => clearTimeout(timer);
  }, [recipientSearchTerm, activeRecipientField, fetchContactSuggestions]);
  const [currency, setCurrencyState] = useState("usd");
  const setCurrency = useCallback((val: string) => {
    setCurrencyState(val);
    try { localStorage.setItem("lexport:last-currency", val); } catch {}
  }, []);
  const [dueDate, setDueDate] = useState(() => {
    // Default to 30 days from now
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");

  // Line items using custom hook
  const { lineItems, setLineItems, subtotal, addPreset, reset } = useLineItems();

  // Restore last-used currency from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lexport:last-currency");
      if (saved) setCurrencyState(saved);
    } catch {}
  }, []);

  // Fetch invoice settings and pre-fill sender email from user profile
  useEffect(() => {
    async function fetchSettings() {
      try {
        const [settingsRes, { createClient }] = await Promise.all([
          fetch("/api/invoices/settings"),
          import("@/lib/supabase/client"),
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const settings = data.settings as InvoiceSettings;
          if (settings.company_name) setSenderName(settings.company_name);
          if (settings.company_address) setSenderAddress(settings.company_address);
          if (settings.company_logo_url) setSenderLogoUrl(settings.company_logo_url);
          if (settings.default_notes) setNotes(settings.default_notes);
          if (settings.default_due_days) {
            const date = new Date();
            date.setDate(date.getDate() + settings.default_due_days);
            setDueDate(date.toISOString().split("T")[0]);
          }
        }
        // Pre-fill sender email from user profile
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && !senderEmail) {
          setSenderEmail(user.email);
        }
      } catch (err) {
        console.error("Failed to fetch invoice settings:", err);
      } finally {
        setSettingsLoaded(true);
      }
    }
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply template defaults when selected
  const handleTemplateSelect = (template: InvoiceTemplate | null) => {
    setSelectedTemplate(template);

    if (template) {
      // Apply template defaults
      if (template.default_notes) {
        setNotes(template.default_notes);
      }
      if (template.default_due_days) {
        const date = new Date();
        date.setDate(date.getDate() + template.default_due_days);
        setDueDate(date.toISOString().split("T")[0]);
      }
      if (template.default_line_items && template.default_line_items.length > 0) {
        reset(template.default_line_items);
      }
    } else {
      // Blank invoice - reset to defaults
      reset();
      setNotes("");
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setDueDate(date.toISOString().split("T")[0]);
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return true; // Template is optional
      case 2:
        return (
          senderName.trim().length > 0 &&
          recipientName.trim().length > 0 &&
          recipientEmail.trim().length > 0
        );
      case 3:
        return (
          lineItems.length > 0 &&
          lineItems.some((item) => item.description.trim().length > 0 && item.amount > 0)
        );
      default:
        return true;
    }
  };

  const canProceed = validateStep(step);

  const handleSubmit = async (sendNow: boolean = false) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // First, create the invoice as draft
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate?.id || null,
          contract_id: contractId || null,
          sender_name: senderName.trim(),
          sender_email: senderEmail.trim() || null,
          sender_address: senderAddress.trim() || null,
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          recipient_address: recipientAddress.trim() || null,
          line_items: lineItems.filter(
            (item) => item.description.trim().length > 0 && item.amount > 0
          ),
          notes: notes.trim() || null,
          due_date: dueDate,
          currency,
          status: "draft", // Always create as draft first
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const data = await response.json();
      const invoiceId = data.invoice.id;

      // If sendNow, call the send endpoint to actually email the invoice
      if (sendNow) {
        const sendResponse = await fetch(`/api/invoices/${invoiceId}/send`, {
          method: "POST",
        });

        if (!sendResponse.ok) {
          const sendData = await sendResponse.json();
          throw new Error(sendData.error || "Invoice created but failed to send email");
        }
      }

      // Redirect to invoice list or detail page
      if (contractId) {
        router.push(`/contracts/${contractId}/edit?tab=invoices`);
      } else {
        router.push("/invoices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={contractId ? `/contracts/${contractId}/edit` : "/invoices"}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {contractId ? "Back to Contract" : "Back to Invoices"}
              </span>
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              Create New Invoice
            </h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step > s.id
                          ? "bg-emerald-500 text-white"
                          : step === s.id
                            ? "bg-[#202e46] text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {step > s.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p
                        className={`text-sm font-medium ${
                          step >= s.id ? "text-slate-900" : "text-slate-500"
                        }`}
                      >
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-500">{s.description}</p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-12 sm:w-20 h-0.5 mx-3 ${
                        step > s.id ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Choose a Template
              </h2>
              <p className="text-slate-600 mt-2">
                Start with a template or create a blank invoice.
              </p>
            </div>

            <InvoiceTemplateSelector
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedTemplate?.id || null}
              showCustomOption={true}
            />
          </div>
        )}

        {/* Step 2: Client Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Invoice Details
              </h2>
              <p className="text-slate-600 mt-2">
                Enter your company and client information.
              </p>
            </div>

            {/* Your Details (From) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-[#529ec6]" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Your Details</h3>
                </div>
                <Link
                  href="/settings/invoices"
                  className="text-xs text-[#529ec6] hover:text-[#202e46] flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  Manage Defaults
                </Link>
              </div>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Your Name / Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Your Company Name"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Your Email <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Your Address <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    placeholder="123 Business St, Suite 100&#10;City, State 12345"
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Client Details (Bill To) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Bill To</h3>
              </div>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative" ref={activeRecipientField === "name" ? contactDropdownRef : undefined}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Recipient Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => {
                        setRecipientName(e.target.value);
                        setActiveRecipientField("name");
                        setRecipientSearchTerm(e.target.value);
                      }}
                      onFocus={() => {
                        setActiveRecipientField("name");
                        setRecipientSearchTerm(recipientName);
                      }}
                      placeholder="John Smith or Company Inc."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                    />
                    {activeRecipientField === "name" && contactSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {contactSuggestions.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setRecipientName(contact.name);
                              setRecipientEmail(contact.email);
                              setActiveRecipientField(null);
                              fetch(`/api/contacts/${contact.id}`, { method: "POST" }).catch(() => {});
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-sm"
                          >
                            <div className="w-6 h-6 rounded-full bg-[#529ec6]/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-[#529ec6]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                              <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                              {contact.company && <p className="text-xs text-slate-400 truncate">{contact.company}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={activeRecipientField === "email" ? contactDropdownRef : undefined}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Recipient Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        setActiveRecipientField("email");
                        setRecipientSearchTerm(e.target.value);
                      }}
                      onFocus={() => {
                        setActiveRecipientField("email");
                        setRecipientSearchTerm(recipientEmail);
                      }}
                      placeholder="john@company.com"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                    />
                    {activeRecipientField === "email" && contactSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {contactSuggestions.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setRecipientName(contact.name);
                              setRecipientEmail(contact.email);
                              setActiveRecipientField(null);
                              fetch(`/api/contacts/${contact.id}`, { method: "POST" }).catch(() => {});
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-sm"
                          >
                            <div className="w-6 h-6 rounded-full bg-[#529ec6]/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-[#529ec6]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                              <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                              {contact.company && <p className="text-xs text-slate-400 truncate">{contact.company}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Billing Address{" "}
                    <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="123 Main St, Suite 100&#10;New York, NY 10001"
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Options */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Invoice Options</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent bg-white"
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Line Items */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Line Items</h2>
              <p className="text-slate-600 mt-2">
                Add the services or products you&apos;re billing for.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Quick Add:
              </p>
              <QuickLineItemPresets onSelect={addPreset} />
            </div>

            {/* Line Items Editor */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <InvoiceLineItemsEditor
                lineItems={lineItems}
                onChange={setLineItems}
                currency={currency}
              />
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes / Terms{" "}
                <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment is due within 30 days. Thank you for your business!"
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Review Your Invoice
              </h2>
              <p className="text-slate-600 mt-2">
                Double-check the details before sending.
              </p>
            </div>

            {/* Professional Invoice Preview */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Invoice Document */}
              <div className="p-8 md:p-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                  <div>
                    {senderLogoUrl ? (
                      <img
                        src={senderLogoUrl}
                        alt="Company Logo"
                        className="h-12 object-contain mb-3"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <p className="text-xs text-slate-400 uppercase tracking-wider">From</p>
                    <p className="font-semibold text-slate-900 mt-1">{senderName}</p>
                    {senderEmail && (
                      <p className="text-sm text-slate-600">{senderEmail}</p>
                    )}
                    {senderAddress && (
                      <p className="text-sm text-slate-600 whitespace-pre-line mt-1">
                        {senderAddress}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">INVOICE</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedTemplate?.name || "Custom Invoice"}
                    </p>
                  </div>
                </div>

                {/* Bill To & Invoice Details */}
                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
                    <p className="font-semibold text-slate-900">{recipientName}</p>
                    <p className="text-slate-600 text-sm">{recipientEmail}</p>
                    {recipientAddress && (
                      <p className="text-slate-600 text-sm whitespace-pre-line mt-1">
                        {recipientAddress}
                      </p>
                    )}
                  </div>
                  <div className="md:text-right">
                    <div className="inline-block md:text-left bg-slate-50 rounded-lg px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <span className="text-slate-500">Invoice Date</span>
                        <span className="text-slate-900 font-medium">
                          {new Date().toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-slate-500">Due Date</span>
                        <span className="text-slate-900 font-medium">
                          {new Date(dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-slate-500">Currency</span>
                        <span className="text-slate-900 font-medium uppercase">{currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems
                        .filter((item) => item.description.trim() && item.amount > 0)
                        .map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="px-4 py-4 text-sm text-slate-900">
                              {item.description}
                            </td>
                            <td className="px-4 py-4 text-sm text-right text-slate-600">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-4 text-sm text-right text-slate-600">
                              {formatCurrency(item.unit_price, currency)}
                            </td>
                            <td className="px-4 py-4 text-sm text-right font-medium text-slate-900">
                              {formatCurrency(item.amount, currency)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="text-slate-900">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                      <span className="text-slate-500">Tax (0%)</span>
                      <span className="text-slate-900">{formatCurrency(0, currency)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t-2 border-slate-900">
                      <span className="text-lg font-bold text-slate-900">Total Due</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(subtotal, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {notes && (
                  <div className="border-t border-slate-200 pt-6">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Notes / Terms</p>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400">
                    A payment link will be included when you send this invoice
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              step === 1 || isSubmitting
                ? "text-slate-400 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                !canProceed
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-[#202e46] text-white hover:bg-[#1a2539]"
              }`}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save as Draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-[#202e46] to-[#2a3d5c] text-white hover:from-[#1a2539] hover:to-[#202e46] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Invoice
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
