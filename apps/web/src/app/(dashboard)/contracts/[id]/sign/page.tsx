"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  Loader2,
  Check,
  Copy,
  Mail,
  User,
  Clock,
  Eye,
} from "lucide-react";
import { PDFPreviewModal } from "@/components/pdf-preview-modal";
import { useOnboarding } from "@/components/onboarding";

interface Signer {
  name: string;
  email: string;
  role?: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  processing_mode?: string;
  source_file_url?: string | null;
}

export default function SendForSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const { completeStep } = useOnboarding();
  const contractId = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "", role: "" }]);
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [signingUrls, setSigningUrls] = useState<Array<{
    name: string;
    email: string;
    url: string;
  }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  // Distinct roles the document's signature fields are assigned to. When this
  // is non-empty, each signer MUST be mapped to one of these roles — otherwise
  // the signer can't be matched to their fields and the contract is unsignable.
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  // Fetch contract
  useEffect(() => {
    async function fetchContract() {
      try {
        const response = await fetch(`/api/contracts/${contractId}`);
        if (!response.ok) throw new Error("Contract not found");
        const data = await response.json();
        setContract(data.contract);

        // Distinct, non-empty roles the document's fields are assigned to.
        const roles = Array.from(
          new Set(
            ((data.signatureFields || []) as Array<{ signer_role?: string }>)
              .map((f) => f.signer_role)
              .filter((r): r is string => !!r && r.trim().length > 0)
          )
        );
        setAvailableRoles(roles);

        // Pre-fill signers from contract metadata if available
        const metadata = data.contract.metadata as Record<string, unknown>;
        if (metadata) {
          const prefillSigners: Signer[] = [];

          // Check for defined_signers first (from visual field editor)
          const definedSigners = metadata.defined_signers as Array<{
            id: string;
            role: string;
            name?: string;
            email?: string;
            company?: string;
          }> | undefined;

          if (definedSigners && definedSigners.length > 0) {
            // Use defined_signers from visual field placement
            for (const signer of definedSigners) {
              if (signer.name || signer.email) {
                prefillSigners.push({
                  name: signer.name || "",
                  email: signer.email || "",
                  role: signer.role,
                });
              }
            }
          }

          // Check for new signerGroups format (multi-signatory support)
          const signerGroups = metadata.signerGroups as Array<{
            role: string;
            roleLabel: string;
            signers: Array<{ id: string; name: string; email: string; title?: string }>;
          }> | undefined;

          if (prefillSigners.length === 0 && signerGroups && signerGroups.length > 0) {
            // Use signerGroups for multi-signatory contracts
            for (const group of signerGroups) {
              for (const signer of group.signers) {
                if (signer.name || signer.email) {
                  prefillSigners.push({
                    name: signer.name || "",
                    email: signer.email || "",
                    role: group.roleLabel,
                  });
                }
              }
            }
          } else if (prefillSigners.length === 0) {
            // Fallback to legacy party extraction
            // Map of all possible party field names to their display roles
            const partyFields: Array<{ field: string; role: string }> = [
              { field: "disclosingParty", role: "Disclosing Party" },
              { field: "receivingParty", role: "Receiving Party" },
              { field: "client", role: "Client" },
              { field: "contractor", role: "Contractor" },
              { field: "consultant", role: "Consultant" },
              { field: "company", role: "Company" },
              { field: "investor", role: "Investor" },
              { field: "freelancer", role: "Freelancer" },
            ];

            for (const { field, role } of partyFields) {
              if (metadata[field]) {
                const party = metadata[field] as { name?: string; email?: string };
                if (party.name || party.email) {
                  prefillSigners.push({
                    name: party.name || "",
                    email: party.email || "",
                    role,
                  });
                }
              }
            }
          }

          if (prefillSigners.length > 0) {
            setSigners(prefillSigners);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId]);

  const addSigner = () => {
    setSigners([...signers, { name: "", email: "", role: "" }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index));
    }
  };

  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const handleSend = async () => {
    // Validate signers
    const validSigners = signers.filter((s) => s.name && s.email);
    if (validSigners.length === 0) {
      setError("Please add at least one signer with name and email");
      return;
    }
    // When the document has role-scoped fields, every signer must be mapped to a
    // role — otherwise they can't be matched to their fields and the contract
    // becomes unsignable. (This is the bug that left signers stuck at "x/6".)
    if (availableRoles.length > 0) {
      const unroled = validSigners.find((s) => !s.role || !s.role.trim());
      if (unroled) {
        setError(
          "Please choose a role for each signer — it's how they're matched to the right signature fields. Without it the contract can't be signed."
        );
        return;
      }
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signers: validSigners,
          message,
          expiresInDays,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send");
      }

      const data = await response.json();
      setSigningUrls(data.signingUrls);
      setSent(true);
      // Mark onboarding step complete
      completeStep("send_signature");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/contracts/${contractId}/edit`}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <h1 className="text-lg font-semibold text-slate-900">
                Signature Requests Sent
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Contract Sent for Signature
            </h2>
            <p className="text-slate-600 mb-8">
              Signature requests have been created. Share the links below with your
              signers.
            </p>

            <div className="space-y-4 text-left">
              {signingUrls.map((signer, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{signer.name}</p>
                      <p className="text-sm text-slate-500">{signer.email}</p>
                    </div>
                    <button
                      onClick={() => copyUrl(signer.url)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={signer.url}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href={`/contracts/${contractId}/edit`}
                className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Back to Contract
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539]"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/contracts/${contractId}/edit`}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Send for Signature
                </h1>
                <p className="text-sm text-slate-500">{contract?.title}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Signers */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Signers</h2>
            <button
              onClick={addSigner}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#529ec6] hover:bg-[#529ec6]/5 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Signer
            </button>
          </div>

          <div className="space-y-4">
            {signers.map((signer, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-[#529ec6]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#529ec6]" />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, "name", e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={signer.email}
                      onChange={(e) => updateSigner(index, "email", e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role {availableRoles.length > 0 ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        "(optional)"
                      )}
                    </label>
                    {availableRoles.length > 0 ? (
                      <select
                        value={signer.role || ""}
                        onChange={(e) => updateSigner(index, "role", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent bg-white"
                      >
                        <option value="">Select role…</option>
                        {availableRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={signer.role || ""}
                        onChange={(e) => updateSigner(index, "role", e.target.value)}
                        placeholder="Contractor"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                      />
                    )}
                  </div>
                </div>
                {signers.length > 1 && (
                  <button
                    onClick={() => removeSigner(index)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Options</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Personal Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to include with the signature request..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expires In
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent bg-white"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Send */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview & Send</h2>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg mb-4">
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-[#529ec6]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Preview PDF before sending</p>
              <p className="text-sm text-slate-500">
                Review how the contract will appear to signers
              </p>
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#529ec6] border border-[#529ec6] rounded-lg hover:bg-[#529ec6]/5 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview PDF
            </button>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href={`/contracts/${contractId}/edit`}
              className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send for Signature
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        contractId={contractId}
        contractTitle={contract?.title || "Contract"}
        sourceFileUrl={
          contract?.processing_mode === "sign_only" ? contract.source_file_url : undefined
        }
      />
    </div>
  );
}
