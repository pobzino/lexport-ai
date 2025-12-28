"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Plus,
  X,
  Upload,
  Send,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
}

type BulkSendStatus = "idle" | "sending" | "complete" | "error";

export default function BulkSendPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState({ name: "", email: "", company: "" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState<BulkSendStatus>("idle");
  const [sendResults, setSendResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Fetch contracts and contacts
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [contractsRes, contactsRes] = await Promise.all([
          fetch("/api/contracts?status=ready_to_send&limit=50"),
          fetch("/api/contacts?limit=100"),
        ]);

        if (contractsRes.ok) {
          const data = await contractsRes.json();
          setContracts(data.contracts || []);
        }

        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddRecipient = () => {
    if (!newRecipient.name || !newRecipient.email) return;

    const id = `temp-${Date.now()}`;
    setRecipients([...recipients, { ...newRecipient, id }]);
    setNewRecipient({ name: "", email: "", company: "" });
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleAddContact = (contact: Contact) => {
    // Check if already added
    if (recipients.some((r) => r.email === contact.email)) return;

    setRecipients([
      ...recipients,
      {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
      },
    ]);
  };

  const handleBulkSend = async () => {
    if (!selectedContract || recipients.length === 0) return;

    setSendStatus("sending");

    try {
      const response = await fetch("/api/contracts/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: selectedContract.id,
          recipients: recipients.map((r) => ({
            name: r.name,
            email: r.email,
            company: r.company,
          })),
          emailSubject: emailSubject || `Signature Request: ${selectedContract.title}`,
          emailMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResults({ success: data.sent || 0, failed: data.failed || 0 });
        setSendStatus("complete");
      } else {
        setSendStatus("error");
      }
    } catch (error) {
      console.error("Error sending:", error);
      setSendStatus("error");
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      // Skip header row
      const dataLines = lines.slice(1);

      const newRecipients: Recipient[] = dataLines.map((line, index) => {
        const [name, email, company] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        return {
          id: `csv-${index}`,
          name: name || "",
          email: email || "",
          company: company || "",
        };
      }).filter((r) => r.name && r.email);

      setRecipients([...recipients, ...newRecipients]);
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = "";
  };

  // Contract type display names
  const contractTypeNames: Record<string, string> = {
    nda_mutual: "Mutual NDA",
    nda_one_way: "One-Way NDA",
    independent_contractor: "Contractor Agreement",
    consulting_agreement: "Consulting Agreement",
    safe_note: "SAFE Note",
    freelance_service: "Freelance Agreement",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">Bulk Send</h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > s
                      ? "bg-emerald-500 text-white"
                      : step === s
                        ? "bg-violet-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-sm ${step >= s ? "text-slate-900" : "text-slate-500"}`}>
                  {s === 1 && "Select Contract"}
                  {s === 2 && "Add Recipients"}
                  {s === 3 && "Review & Send"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Select Contract */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Select a Contract Template</h2>
              <p className="text-slate-600 mt-2">
                Choose a contract to send to multiple recipients at once.
              </p>
            </div>

            {contracts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No Contracts Ready</h3>
                <p className="text-slate-500 mb-4">
                  You need to create a contract first before you can bulk send.
                </p>
                <Link
                  href="/contracts/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Contract
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {contracts.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => setSelectedContract(contract)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedContract?.id === contract.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 bg-white hover:border-violet-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{contract.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {contractTypeNames[contract.type] || contract.type}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedContract?.id === contract.id
                            ? "border-violet-600 bg-violet-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedContract?.id === contract.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Add Recipients */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Add Recipients</h2>
              <p className="text-slate-600 mt-2">
                Add the people who will receive this contract for signing.
              </p>
            </div>

            {/* Quick Add from Contacts */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Quick Add from Contacts</h3>
                <button
                  onClick={() => setShowContactPicker(!showContactPicker)}
                  className="text-sm text-violet-600 hover:text-violet-700"
                >
                  {showContactPicker ? "Hide" : "Show"} Contacts
                </button>
              </div>

              {showContactPicker && (
                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {contacts.map((contact) => {
                    const isAdded = recipients.some((r) => r.email === contact.email);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => !isAdded && handleAddContact(contact)}
                        disabled={isAdded}
                        className={`p-2 rounded-lg text-left text-sm ${
                          isAdded
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-slate-50 hover:bg-violet-50 text-slate-700"
                        }`}
                      >
                        <p className="font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CSV Upload */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Import from CSV</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">Upload CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Format: name, email, company (one per row)
                </p>
              </div>
            </div>

            {/* Manual Add */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Add Manually</h3>
              <div className="grid sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  placeholder="Company (optional)"
                  value={newRecipient.company}
                  onChange={(e) => setNewRecipient({ ...newRecipient, company: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={handleAddRecipient}
                  disabled={!newRecipient.name || !newRecipient.email}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Recipients List */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">
                  Recipients ({recipients.length})
                </h3>
                {recipients.length > 0 && (
                  <button
                    onClick={() => setRecipients([])}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {recipients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No recipients added yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{recipient.name}</p>
                        <p className="text-sm text-slate-500">
                          {recipient.email}
                          {recipient.company && ` • ${recipient.company}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveRecipient(recipient.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && (
          <div className="space-y-6">
            {sendStatus === "idle" && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Review & Send</h2>
                  <p className="text-slate-600 mt-2">
                    Review your bulk send and customize the email message.
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Contract</p>
                      <p className="font-medium text-slate-900">{selectedContract?.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Recipients</p>
                      <p className="font-medium text-slate-900">{recipients.length} people</p>
                    </div>
                  </div>
                </div>

                {/* Email Customization */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Email Message</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder={`Signature Request: ${selectedContract?.title}`}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Personal Message (optional)
                      </label>
                      <textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Add a personal note to include in the email..."
                        rows={4}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Recipients Preview */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Sending To</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipients.slice(0, 10).map((recipient) => (
                      <span
                        key={recipient.id}
                        className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm"
                      >
                        {recipient.name}
                      </span>
                    ))}
                    {recipients.length > 10 && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                        +{recipients.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {sendStatus === "sending" && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Sending Contracts...
                </h3>
                <p className="text-slate-500">
                  Sending to {recipients.length} recipients. This may take a moment.
                </p>
              </div>
            )}

            {sendStatus === "complete" && (
              <div className="bg-white rounded-xl border border-emerald-200 p-12 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Contracts Sent Successfully!
                </h3>
                <p className="text-slate-600 mb-6">
                  {sendResults.success} contracts sent successfully
                  {sendResults.failed > 0 && `, ${sendResults.failed} failed`}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                  >
                    Back to Dashboard
                  </Link>
                  <Link
                    href="/signatures"
                    className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    View Signatures
                  </Link>
                </div>
              </div>
            )}

            {sendStatus === "error" && (
              <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Something Went Wrong
                </h3>
                <p className="text-slate-600 mb-6">
                  There was an error sending the contracts. Please try again.
                </p>
                <button
                  onClick={() => setSendStatus("idle")}
                  className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        {sendStatus === "idle" && (
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                step === 1
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !selectedContract) || (step === 2 && recipients.length === 0)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                  (step === 1 && !selectedContract) || (step === 2 && recipients.length === 0)
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                Continue
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button
                onClick={handleBulkSend}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
              >
                <Send className="w-4 h-4" />
                Send to {recipients.length} Recipients
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
