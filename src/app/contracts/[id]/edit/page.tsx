"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Check,
  X,
  Info,
  AlertCircle,
  FileText,
  Download,
  PenTool,
  Users,
} from "lucide-react";
import type { Clause } from "@/lib/contracts/schemas";
import { SignatureFieldEditor, type SignatureField } from "@/components/signature-field-editor";
import { SignatureBlockDisplay } from "@/components/signature-block-display";
import { SignerStatusPanel } from "@/components/signer-status-panel";

interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signatureBlock: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  content: ContractContent;
  metadata: Record<string, unknown>;
  version: number;
}

// Database signature field interface (snake_case from API)
interface DBSignatureField {
  id: string;
  contract_id: string;
  type: "signature" | "initials" | "date" | "text";
  label?: string;
  signer_role: string;
  required: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  order: number;
}

interface SignatureRequest {
  id: string;
  signer_email: string;
  signer_name: string;
  signer_role?: string;
  status: "pending" | "viewed" | "signed" | "declined";
  signed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  expires_at: string;
  token: string;
  created_at: string;
}

interface Signature {
  id: string;
  signature_request_id: string;
  signature_data: string;
  signature_type: string;
  signed_at: string;
}

interface FieldValue {
  id: string;
  field_id: string;
  signature_request_id: string;
  value?: string;
  signature_id?: string;
  completed_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClauseExplanation {
  summary: string;
  explanation: string;
  keyPoints: string[];
  risks?: string[];
  negotiationTips?: string[];
}

export default function ContractEditorPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeClause, setActiveClause] = useState<string | null>(null);
  const [editingClause, setEditingClause] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [showChat, setShowChat] = useState(false);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  // Signature field state
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [dbSignatureFields, setDbSignatureFields] = useState<DBSignatureField[]>([]);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [showSignerPanel, setShowSignerPanel] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Explanation state
  const [explanation, setExplanation] = useState<ClauseExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Convert DB field to frontend format
  const mapDbFieldToField = (dbField: DBSignatureField): SignatureField => ({
    id: dbField.id,
    type: dbField.type,
    label: dbField.label,
    signerRole: dbField.signer_role,
    required: dbField.required,
    positionX: dbField.position_x,
    positionY: dbField.position_y,
    width: dbField.width,
    height: dbField.height,
    order: dbField.order,
  });


  // Get signer roles based on contract type (matching generation logic)
  const getSignerRoles = (): string[] => {
    if (!contract?.type) return ["Signer"];

    switch (contract.type) {
      case "nda_mutual":
      case "nda_one_way":
        return ["Disclosing Party", "Receiving Party"];
      case "independent_contractor":
        return ["Company", "Contractor"];
      case "consulting_agreement":
        return ["Client", "Consultant"];
      case "safe_note":
        return ["Company", "Investor"];
      case "freelance_service":
        return ["Client", "Freelancer"];
      default:
        return ["Party 1", "Party 2"];
    }
  };

  // Fetch contract
  useEffect(() => {
    async function fetchContract() {
      try {
        const response = await fetch(`/api/contracts/${contractId}`);
        if (!response.ok) throw new Error("Contract not found");
        const data = await response.json();
        setContract(data.contract);

        // Store signature-related data
        if (data.signatureFields) {
          setDbSignatureFields(data.signatureFields);
          setSignatureFields(data.signatureFields.map(mapDbFieldToField));
        }
        if (data.signatureRequests) {
          setSignatureRequests(data.signatureRequests);
        }
        if (data.signatures) {
          setSignatures(data.signatures);
        }
        if (data.fieldValues) {
          setFieldValues(data.fieldValues);
        }

        // Expand all clauses by default
        if (data.contract?.content?.clauses) {
          setExpandedClauses(
            new Set(data.contract.content.clauses.map((c: Clause) => c.id))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Toggle clause expansion
  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  // Start editing a clause
  const startEditing = (clause: Clause) => {
    setEditingClause(clause.id);
    setEditedContent(clause.content);
  };

  // Save edited clause
  const saveClauseEdit = async () => {
    if (!contract || !editingClause) return;

    const updatedClauses = contract.content.clauses.map((c) =>
      c.id === editingClause
        ? {
          ...c,
          content: editedContent,
          isEdited: true,
          originalContent: c.originalContent || c.content,
        }
        : c
    );

    setContract({
      ...contract,
      content: { ...contract.content, clauses: updatedClauses },
    });
    setEditingClause(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingClause(null);
    setEditedContent("");
  };

  // Create signature field
  const handleFieldCreate = async (field: Omit<SignatureField, "id">): Promise<SignatureField> => {
    const response = await fetch(`/api/contracts/${contractId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(field),
    });

    if (!response.ok) throw new Error("Failed to create field");
    const data = await response.json();
    const newField = mapDbFieldToField(data.field);
    // Add the new field to state
    setSignatureFields(prev => [...prev, newField]);
    setDbSignatureFields(prev => [...prev, data.field]);
    return newField;
  };

  // Update signature field
  const handleFieldUpdate = async (fieldId: string, updates: Partial<SignatureField>): Promise<void> => {
    const response = await fetch(`/api/contracts/${contractId}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldId, ...updates }),
    });

    if (!response.ok) throw new Error("Failed to update field");
  };

  // Delete signature field
  const handleFieldDelete = async (fieldId: string): Promise<void> => {
    const response = await fetch(`/api/contracts/${contractId}/fields?fieldId=${fieldId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete field");
    setSignatureFields((prev) => prev.filter((f) => f.id !== fieldId));
    setDbSignatureFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  // Resend signature request
  const handleResendRequest = async (requestId: string): Promise<void> => {
    const response = await fetch(`/api/contracts/${contractId}/signature-requests/${requestId}/resend`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to resend");
  };

  // Explain a clause
  const explainClause = async (clauseId: string) => {
    setExplaining(true);
    setActiveClause(clauseId);
    setExplanation(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/clause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain",
          clauseId,
        }),
      });

      if (!response.ok) throw new Error("Failed to explain clause");
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      console.error("Error explaining clause:", err);
    } finally {
      setExplaining(false);
    }
  };

  // Modify clause with AI
  const modifyClauseWithAI = async (clauseId: string, instruction: string) => {
    setChatLoading(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/clause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "modify",
          clauseId,
          instruction,
        }),
      });

      if (!response.ok) throw new Error("Failed to modify clause");
      const data = await response.json();

      // Update local contract state
      if (data.contract) {
        setContract(data.contract);
      }

      // Add AI response to chat
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've updated the "${data.modification.title}" clause. ${data.modification.explanation}`,
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't modify that clause. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Chat with AI
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      // Check if this is a modification request
      const modifyMatch = userMessage.match(
        /(?:modify|change|update|edit)\s+(?:the\s+)?(.+?)\s+(?:clause|section)/i
      );

      if (modifyMatch && activeClause) {
        await modifyClauseWithAI(activeClause, userMessage);
      } else {
        // Regular chat
        const response = await fetch(`/api/contracts/${contractId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...chatMessages, { role: "user", content: userMessage }],
          }),
        });

        if (!response.ok) throw new Error("Chat failed");
        const data = await response.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);

        // If contract was updated by AI, refresh the local state
        if (data.contractUpdated && data.contract) {
          setContract(data.contract);
        }
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Save entire contract
  const saveContract = async () => {
    if (!contract) return;
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contract.content,
          version: (contract.version || 0) + 1,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      const data = await response.json();
      setContract(data.contract);
      setSaved(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  // Download PDF
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract?.title || "contract"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {error || "Contract not found"}
          </h2>
          <Link href="/dashboard" className="text-violet-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 flex-shrink-0 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="font-semibold text-slate-900 text-sm">{contract.title}</h1>
                <p className="text-xs text-slate-500">
                  Version {contract.version} • {contract.status}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Signer Status Toggle */}
              {signatureRequests.length > 0 && (
                <button
                  onClick={() => {
                    setShowSignerPanel(!showSignerPanel);
                    setShowChat(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${showSignerPanel
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Signers</span>
                  <span className="text-xs bg-slate-200/80 px-1.5 py-0.5 rounded-full font-medium">
                    {signatureRequests.filter((r) => r.status === "signed").length}/{signatureRequests.length}
                  </span>
                </button>
              )}
              {/* Configure Fields Toggle */}
              <button
                onClick={() => setIsEditingFields(!isEditingFields)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${isEditingFields
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <PenTool className="w-4 h-4" />
                {isEditingFields ? "Done Editing" : "Configure Fields"}
              </button>
              <button
                onClick={() => {
                  setShowChat(!showChat);
                  setShowSignerPanel(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${showChat
                  ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">AI Chat</span>
              </button>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={saveContract}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${saved
                  ? "bg-emerald-600 text-white"
                  : "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                  } disabled:opacity-50`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? "Saved!" : "Save"}
              </button>
              <Link
                href={`/contracts/${contractId}/sign`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden md:inline">Send for Signature</span>
                <span className="md:hidden">Send</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contract Editor */}
        <main
          className="flex-1 overflow-auto p-6"
        >
          <div className="max-w-4xl mx-auto">
            {/* Contract Document */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Title */}
              <div className="px-8 py-6 border-b border-slate-100 text-center">
                <h2 className="text-2xl font-bold text-slate-900">
                  {contract.title}
                </h2>
              </div>

              {/* Preamble */}
              <div className="px-8 py-6 border-b border-slate-100">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {contract.content.preamble}
                </p>
              </div>

              {/* Recitals */}
              {contract.content.recitals && (
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">
                    Recitals
                  </h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {contract.content.recitals}
                  </p>
                </div>
              )}

              {/* Clauses */}
              <div className="divide-y divide-slate-100">
                {contract.content.clauses.map((clause) => (
                  <div
                    key={clause.id}
                    className={`transition-colors ${activeClause === clause.id ? "bg-violet-50" : ""
                      }`}
                  >
                    {/* Clause Header */}
                    <div
                      onClick={() => toggleClause(clause.id)}
                      className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {expandedClauses.has(clause.id) ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="font-semibold text-slate-900">
                          {clause.title}
                        </span>
                        {clause.isEdited && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            Edited
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${clause.type === "standard"
                            ? "bg-slate-100 text-slate-600"
                            : clause.type === "negotiable"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                            }`}
                        >
                          {clause.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveClause(clause.id);
                            explainClause(clause.id);
                            setShowChat(true);
                          }}
                          className="p-2 hover:bg-slate-200 rounded-lg"
                          title="Explain this clause"
                        >
                          <Info className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(clause);
                          }}
                          className="p-2 hover:bg-slate-200 rounded-lg"
                          title="Edit this clause"
                        >
                          <Edit3 className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Clause Content */}
                    {expandedClauses.has(clause.id) && (
                      <div className="px-8 pb-6">
                        {editingClause === clause.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none font-mono text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={saveClauseEdit}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                              >
                                <Check className="w-4 h-4" />
                                Save Changes
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pl-8">
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {clause.content}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Signature Block / Field Editor */}
              {isEditingFields ? (
                <div className="px-8 py-6 bg-white border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4 flex items-center justify-between">
                    <span>Configure Signature Fields</span>
                  </h3>
                  <SignatureFieldEditor
                    fields={signatureFields}
                    signerRoles={getSignerRoles()}
                    signatureBlock={contract.content.signatureBlock}
                    onFieldsChange={setSignatureFields}
                    onFieldCreate={handleFieldCreate}
                    onFieldUpdate={handleFieldUpdate}
                    onFieldDelete={handleFieldDelete}
                  />
                </div>
              ) : (
                <SignatureBlockDisplay
                  signatureBlock={contract.content.signatureBlock}
                  fields={dbSignatureFields}
                  fieldValues={fieldValues}
                  signatures={signatures}
                  signatureRequests={signatureRequests}
                  showPlaceholders={true}
                />
              )}
            </div>
          </div>
        </main>

        {/* AI Chat Sidebar */}
        {showChat && (
          <aside className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                  <span className="font-semibold text-slate-900">
                    AI Assistant
                  </span>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              {activeClause && (
                <p className="text-sm text-slate-500 mt-1">
                  Focused on:{" "}
                  {contract.content.clauses.find((c) => c.id === activeClause)
                    ?.title || "Contract"}
                </p>
              )}
            </div>

            {/* Explanation Panel */}
            {(explaining || explanation) && (
              <div className="p-4 border-b border-slate-200 bg-violet-50 flex-shrink-0">
                {explaining ? (
                  <div className="flex items-center gap-2 text-violet-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing clause...</span>
                  </div>
                ) : explanation ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-900">
                      {explanation.summary}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {explanation.explanation}
                    </p>
                    {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                          Key Points
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {explanation.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-violet-500">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                      onClick={() => setExplanation(null)}
                      className="text-xs text-violet-600 hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4 min-h-0">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Ask me anything about this contract.
                  </p>
                  <p className="text-xs mt-1">
                    Click on a clause to focus our conversation.
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2 rounded-xl ${msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-900"
                      }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-sm prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Ask about this contract..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Explain this clause", "Make it simpler", "What are the risks?"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setChatInput(suggestion);
                      }}
                      className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Signer Status Sidebar */}
        {showSignerPanel && (
          <aside className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-slate-900">Signer Status</span>
                </div>
                <button
                  onClick={() => setShowSignerPanel(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Status Panel Content */}
            <div className="flex-1 overflow-auto p-4">
              <SignerStatusPanel
                signatureRequests={signatureRequests}
                signatures={signatures}
                contractId={contractId}
                onResend={handleResendRequest}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
