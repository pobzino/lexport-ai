"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  DollarSign,
  CreditCard,
  ClipboardList,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Undo2,
  MessageCircle,
  Clock,
  History,
  ShieldAlert,
  AlertTriangle,
  MoreHorizontal,
  FileStack,
  BookOpen,
  Lock,
  Upload,
  Folder,
} from "lucide-react";
import type { Clause } from "@/lib/contracts/schemas";
import { SignatureFieldEditor, type SignatureField } from "@/components/signature-field-editor";
import { SignatureFieldEditorVisual, type PlacedFieldData } from "@/components/signature-field-editor/index";
import { SignatureBlockDisplay } from "@/components/signature-block-display";
import { AIDisclaimer } from "@/components/contracts/AIDisclaimer";
import { SignerStatusPanel } from "@/components/signer-status-panel";
import { CommentSidebar, CommentIndicator } from "@/components/comments";
import { SelectionPopup } from "@/components/comments/SelectionPopup";
import { HighlightedClauseContent } from "@/components/comments/HighlightedClauseContent";
import type { CommentWithUser } from "@/db/types";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import { RiskAnalysisPanel } from "@/components/risk-analysis";
import { ShareForReviewModal } from "@/components/share-for-review-modal";
import { InvoicePanel } from "@/components/invoice-panel";
import { ReviewPanel } from "@/components/review-panel";
import { SectionExplainer } from "@/components/contracts/SectionExplainer";
import { SaveAsTemplateModal } from "@/components/templates/SaveAsTemplateModal";
import { FieldTemplateEditor } from "@/components/templates/FieldTemplateEditor";
import { EmbeddedPDFViewer } from "@/components/embedded-pdf-viewer";
import { DefineSignersModal, type SignerDefinition } from "@/components/define-signers-modal";
import type { ContractVersion, ContractContent as ContractContentType } from "@/db/types";
import type { RiskAnalysisResult } from "@/types/risk-analysis";
import { ContractChat } from "@/components/contract-chat";
import { useOnboarding } from "@/components/onboarding";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { ContractPaywall } from "@/components/paywall/ContractPaywall";
import { TagInput } from "@/components/dashboard/TagInput";

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
  user_id: string;
  // Payment settings
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string;
  payment_status: string;
  payment_structure: "full" | "deposit_balance" | "bnpl";
  deposit_percentage: number | null;
  // Upload support
  source_type?: "generated" | "uploaded";
  source_file_url?: string | null;
  source_file_type?: "pdf" | "docx" | "jpg" | "png" | null;
  processing_mode?: "sign_only" | "edit_and_sign" | "full" | null;
  extracted_text?: string | null;
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
  page?: number;
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

// Fillable blank tracking
interface FilledBlank {
  clauseId: string;
  index: number;
  value: string;
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
  const { completeStep } = useOnboarding();
  const contractId = params.id as string;
  const subscription = useSubscription();

  // Check if paywall should be shown (free tier, exceeded limit)
  const showPaywall = !subscription.isLoading &&
    subscription.tier === "free" &&
    subscription.aiContractsUsed > subscription.aiContractsLimit;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeClause, setActiveClause] = useState<string | null>(null);
  const [editingClause, setEditingClause] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState<string>("");
  const [showChat, setShowChat] = useState(true);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  // Signature field state
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [dbSignatureFields, setDbSignatureFields] = useState<DBSignatureField[]>([]);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [showDefineSigners, setShowDefineSigners] = useState(false);
  const [definedSigners, setDefinedSigners] = useState<SignerDefinition[]>([]);
  const [showSignerPanel, setShowSignerPanel] = useState(false);
  const [showFillBlanksPanel, setShowFillBlanksPanel] = useState(false);

  // Payment settings state
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentCurrency, setPaymentCurrency] = useState("usd");
  const [paymentStructure, setPaymentStructure] = useState<"full" | "deposit_balance" | "bnpl">("full");
  const [depositPercentage, setDepositPercentage] = useState<string>("30");
  const [balanceDueDate, setBalanceDueDate] = useState<string>("");

  // Chat context state (for text selection)
  const [chatContext, setChatContext] = useState<{ text: string; action?: string } | null>(null);

  // Explanation state
  const [explanation, setExplanation] = useState<ClauseExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Fillable blanks state
  const [filledBlanks, setFilledBlanks] = useState<Map<string, string>>(new Map());

  // Undo state for deleted clauses
  const [deletedClause, setDeletedClause] = useState<{ clause: Clause; index: number } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [activeCommentClause, setActiveCommentClause] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);

  // Text selection state for inline commenting (controls popup visibility)
  const [textSelection, setTextSelection] = useState<{
    clauseId: string;
    text: string;
    start: number;
    end: number;
    position: { x: number; y: number };
  } | null>(null);

  // Pending comment selection - stored separately so it persists after popup closes
  const [pendingCommentSelection, setPendingCommentSelection] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<ContractContentType | null>(null);

  // Risk analysis state
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Tools menu state
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Share for review modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Review panel state
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  // Save as template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Section Explainer state
  const [showSectionExplainer, setShowSectionExplainer] = useState(false);

  // Track open panels for limiting to max 2
  type PanelName = 'chat' | 'signerPanel' | 'fillBlanksPanel' | 'paymentSettings' |
    'invoicePanel' | 'comments' | 'versionHistory' | 'riskAnalysis' | 'reviewPanel' | 'sectionExplainer';

  const [openPanels, setOpenPanels] = useState<PanelName[]>(['chat']); // chat is open by default

  // Helper to open a panel while enforcing max 2 limit
  const openPanel = useCallback((panelName: PanelName) => {
    setOpenPanels(prev => {
      // If panel is already open, just return current state
      if (prev.includes(panelName)) return prev;

      // If we have 2 or more panels, close the oldest one
      const newPanels = prev.length >= 2
        ? [...prev.slice(1), panelName]
        : [...prev, panelName];

      return newPanels;
    });

    // Open the requested panel
    switch (panelName) {
      case 'chat': setShowChat(true); break;
      case 'signerPanel': setShowSignerPanel(true); break;
      case 'fillBlanksPanel': setShowFillBlanksPanel(true); break;
      case 'paymentSettings': setShowPaymentSettings(true); break;
      case 'invoicePanel': setShowInvoicePanel(true); break;
      case 'comments': setShowComments(true); break;
      case 'versionHistory': setShowVersionHistory(true); break;
      case 'riskAnalysis': setShowRiskAnalysis(true); break;
      case 'reviewPanel': setShowReviewPanel(true); break;
      case 'sectionExplainer': setShowSectionExplainer(true); break;
    }
  }, []);

  // Helper to close a panel
  const closePanel = useCallback((panelName: PanelName) => {
    setOpenPanels(prev => prev.filter(p => p !== panelName));

    switch (panelName) {
      case 'chat': setShowChat(false); break;
      case 'signerPanel': setShowSignerPanel(false); break;
      case 'fillBlanksPanel': setShowFillBlanksPanel(false); break;
      case 'paymentSettings': setShowPaymentSettings(false); break;
      case 'invoicePanel': setShowInvoicePanel(false); break;
      case 'comments': setShowComments(false); break;
      case 'versionHistory': setShowVersionHistory(false); break;
      case 'riskAnalysis': setShowRiskAnalysis(false); break;
      case 'reviewPanel': setShowReviewPanel(false); break;
      case 'sectionExplainer': setShowSectionExplainer(false); break;
    }
  }, []);

  // Helper to toggle a panel
  const togglePanel = useCallback((panelName: PanelName) => {
    const isOpen = openPanels.includes(panelName);
    if (isOpen) {
      closePanel(panelName);
    } else {
      openPanel(panelName);
    }
  }, [openPanels, openPanel, closePanel]);

  // Effect to sync panel states with openPanels
  useEffect(() => {
    // Close panels that are not in openPanels
    if (!openPanels.includes('chat')) setShowChat(false);
    if (!openPanels.includes('signerPanel')) setShowSignerPanel(false);
    if (!openPanels.includes('fillBlanksPanel')) setShowFillBlanksPanel(false);
    if (!openPanels.includes('paymentSettings')) setShowPaymentSettings(false);
    if (!openPanels.includes('invoicePanel')) setShowInvoicePanel(false);
    if (!openPanels.includes('comments')) setShowComments(false);
    if (!openPanels.includes('versionHistory')) setShowVersionHistory(false);
    if (!openPanels.includes('riskAnalysis')) setShowRiskAnalysis(false);
    if (!openPanels.includes('reviewPanel')) setShowReviewPanel(false);
    if (!openPanels.includes('sectionExplainer')) setShowSectionExplainer(false);
  }, [openPanels]);

  // Close tools menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle blank value change
  const handleBlankChange = (key: string, value: string) => {
    setFilledBlanks(prev => {
      const newMap = new Map(prev);
      newMap.set(key, value);
      return newMap;
    });
  };

  // Scroll to a blank in the document and focus it
  const scrollToBlank = (blankKey: string) => {
    const element = document.getElementById(`blank-input-${blankKey}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus after scroll animation
      setTimeout(() => {
        element.focus();
      }, 300);
    }
  };

  // Handle text selection for inline commenting
  const handleTextSelect = (clauseId: string, contentRef: HTMLElement | null) => {
    if (!contentRef) return;

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 2) return;

      // Get the selection range
      const range = selection.getRangeAt(0);
      if (!contentRef.contains(range.commonAncestorContainer)) return;

      // Calculate the character offset within the content
      const preSelectionRange = document.createRange();
      preSelectionRange.selectNodeContents(contentRef);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;
      const end = start + selectedText.length;

      // Get position for popup
      const rect = range.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top,
      };

      setTextSelection({
        clauseId,
        text: selectedText,
        start,
        end,
        position,
      });
    }, 10);
  };

  // Handle adding comment from text selection
  const handleAddCommentFromSelection = () => {
    if (!textSelection) return;

    // Store selection data for the comment before clearing the popup
    setPendingCommentSelection({
      text: textSelection.text,
      start: textSelection.start,
      end: textSelection.end,
    });

    setActiveCommentClause(textSelection.clauseId);
    setShowComments(true);

    // Clear the popup - selection data is now in pendingCommentSelection
    setTextSelection(null);
  };

  // Handle AI quick action - set context and open chat
  const handleQuickAction = async (action: string, prompt: string) => {
    // Clear the text selection popup first
    setTextSelection(null);

    // Open AI chat
    openPanel('chat');

    // Set the context with the selected text and action
    const selectedText = prompt.split('\n\n')[1] || prompt;
    setChatContext({ text: selectedText, action });
  };

  // Handle adding selected text to chat for custom question
  const handleAddToChat = (text: string) => {
    // Clear the text selection popup
    setTextSelection(null);

    // Open AI chat
    openPanel('chat');

    // Set the context for the chat component
    setChatContext({ text });
  };

  // Handle text selection from HighlightedClauseContent
  const handleHighlightedTextSelect = (selection: {
    clauseId: string;
    text: string;
    start: number;
    end: number;
    position: { x: number; y: number };
  }) => {
    setTextSelection(selection);
  };

  // Handle clicking on a highlight to open comment sidebar
  const handleHighlightClick = (commentId: string, clauseId: string) => {
    setActiveCommentClause(clauseId);
    setShowComments(true);
    // TODO: Could scroll to the specific comment in the sidebar
  };

  // Handle jumping to a specific selection in the document from a comment
  const handleJumpToSelection = useCallback((clauseId: string, selectionStart: number, selectionEnd: number) => {
    // Expand the clause if collapsed
    setExpandedClauses((prev) => new Set([...prev, clauseId]));

    // Small delay to ensure clause is expanded before scrolling
    setTimeout(() => {
      const clauseElement = document.getElementById(`clause-${clauseId}`);
      if (clauseElement) {
        clauseElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // Find the highlighted mark element with matching data attributes
        const highlightedMarks = clauseElement.querySelectorAll("mark[data-start]");
        for (const mark of highlightedMarks) {
          const start = parseInt(mark.getAttribute("data-start") || "0");
          const end = parseInt(mark.getAttribute("data-end") || "0");
          if (start === selectionStart && end === selectionEnd) {
            // Flash animation on the highlight
            mark.classList.add("ring-2", "ring-amber-500", "ring-offset-2");
            setTimeout(() => {
              mark.classList.remove("ring-2", "ring-amber-500", "ring-offset-2");
            }, 2000);
            break;
          }
        }
      }
    }, 100);
  }, []);

  // Render clause content with fillable blanks highlighted
  const renderClauseContent = (content: string, clauseId: string) => {
    // Pattern matches 5+ underscores (the standard blank format)
    const blankPattern = /_{5,}/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;
    let blankIndex = 0;

    while ((match = blankPattern.exec(content)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Create unique key for this blank
      const blankKey = `${clauseId}-blank-${blankIndex}`;
      const filledValue = filledBlanks.get(blankKey) || "";

      // Add the fillable blank input
      parts.push(
        <span key={blankKey} className="inline-block relative mx-0.5">
          <input
            id={`blank-input-${blankKey}`}
            type="text"
            value={filledValue}
            onChange={(e) => handleBlankChange(blankKey, e.target.value)}
            placeholder="fill in"
            className={`
              inline-block min-w-[80px] max-w-[200px] px-2 py-0.5
              text-center font-medium rounded
              border-b-2 border-dashed
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${filledValue
                ? "bg-emerald-50 border-emerald-400 text-emerald-700 focus:ring-emerald-400"
                : "bg-amber-50 border-amber-400 text-amber-700 focus:ring-amber-400 animate-pulse"
              }
            `}
            style={{ width: `${Math.max(80, filledValue.length * 10 + 20)}px` }}
            onClick={(e) => e.stopPropagation()}
          />
          {!filledValue && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </span>
      );

      lastIndex = match.index + match[0].length;
      blankIndex++;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    // If no blanks found, just return the content
    if (parts.length === 0) {
      return content;
    }

    return <>{parts}</>;
  };

  // Count blanks in contract
  const countBlanks = (): { total: number; filled: number } => {
    if (!contract) return { total: 0, filled: 0 };

    const blankPattern = /_{5,}/g;
    let totalBlanks = 0;
    let filledCount = 0;

    // Count in preamble
    const preambleMatches = contract.content.preamble.match(blankPattern) || [];
    preambleMatches.forEach((_, i) => {
      totalBlanks++;
      if (filledBlanks.get(`preamble-blank-${i}`)) filledCount++;
    });

    // Count in recitals
    if (contract.content.recitals) {
      const recitalsMatches = contract.content.recitals.match(blankPattern) || [];
      recitalsMatches.forEach((_, i) => {
        totalBlanks++;
        if (filledBlanks.get(`recitals-blank-${i}`)) filledCount++;
      });
    }

    // Count in clauses
    contract.content.clauses.forEach((clause) => {
      const clauseMatches = clause.content.match(blankPattern) || [];
      clauseMatches.forEach((_, i) => {
        totalBlanks++;
        if (filledBlanks.get(`${clause.id}-blank-${i}`)) filledCount++;
      });
    });

    return { total: totalBlanks, filled: filledCount };
  };

  const blankCounts = countBlanks();

  // Determine if contract is locked (sent for signature or beyond)
  // Locked contracts cannot be edited to maintain document integrity
  const lockedStatuses = ["pending_signature", "signed", "completed", "expired"];
  const isLocked = contract ? lockedStatuses.includes(contract.status) : false;

  // Extract all blanks with surrounding context for the side panel
  interface BlankInfo {
    key: string;
    sectionId: string;
    sectionTitle: string;
    contextBefore: string;
    contextAfter: string;
    index: number;
  }

  const extractBlanksWithContext = (): BlankInfo[] => {
    if (!contract) return [];

    const blanks: BlankInfo[] = [];
    const blankPattern = /_{5,}/g;

    // Helper to extract context around a blank
    const getContext = (text: string, matchIndex: number, matchLength: number) => {
      const contextChars = 30;
      const before = text.slice(Math.max(0, matchIndex - contextChars), matchIndex).trim();
      const after = text.slice(matchIndex + matchLength, matchIndex + matchLength + contextChars).trim();
      return {
        contextBefore: before.length < matchIndex ? "..." + before : before,
        contextAfter: after + (matchIndex + matchLength + contextChars < text.length ? "..." : ""),
      };
    };

    // Extract from preamble
    let match;
    let blankIndex = 0;
    const preambleRegex = /_{5,}/g;
    while ((match = preambleRegex.exec(contract.content.preamble)) !== null) {
      const context = getContext(contract.content.preamble, match.index, match[0].length);
      blanks.push({
        key: `preamble-blank-${blankIndex}`,
        sectionId: "preamble",
        sectionTitle: "Preamble",
        ...context,
        index: blankIndex,
      });
      blankIndex++;
    }

    // Extract from recitals
    if (contract.content.recitals) {
      blankIndex = 0;
      const recitalsRegex = /_{5,}/g;
      while ((match = recitalsRegex.exec(contract.content.recitals)) !== null) {
        const context = getContext(contract.content.recitals, match.index, match[0].length);
        blanks.push({
          key: `recitals-blank-${blankIndex}`,
          sectionId: "recitals",
          sectionTitle: "Recitals",
          ...context,
          index: blankIndex,
        });
        blankIndex++;
      }
    }

    // Extract from clauses
    for (const clause of contract.content.clauses) {
      blankIndex = 0;
      const clauseRegex = /_{5,}/g;
      while ((match = clauseRegex.exec(clause.content)) !== null) {
        const context = getContext(clause.content, match.index, match[0].length);
        blanks.push({
          key: `${clause.id}-blank-${blankIndex}`,
          sectionId: clause.id,
          sectionTitle: clause.title,
          ...context,
          index: blankIndex,
        });
        blankIndex++;
      }
    }

    return blanks;
  };

  const allBlanks = extractBlanksWithContext();

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
    page: dbField.page || 1,
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

  // Extract signer info from contract metadata (party_a/party_b data)
  const extractSignersFromMetadata = (contractData: Contract): SignerDefinition[] => {
    const meta = contractData.metadata || {};
    const contractType = contractData.type;
    const SIGNER_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

    // Map contract type to metadata keys and role labels
    const roleMap: Record<string, { primary: string; secondary: string }> = {
      nda_mutual: { primary: "disclosingParty", secondary: "receivingParty" },
      nda_one_way: { primary: "disclosingParty", secondary: "receivingParty" },
      independent_contractor: { primary: "client", secondary: "contractor" },
      consulting_agreement: { primary: "client", secondary: "consultant" },
      safe_note: { primary: "company", secondary: "investor" },
      freelance_service: { primary: "client", secondary: "freelancer" },
    };

    const roleLabelMap: Record<string, { primary: string; secondary: string }> = {
      nda_mutual: { primary: "Disclosing Party", secondary: "Receiving Party" },
      nda_one_way: { primary: "Disclosing Party", secondary: "Receiving Party" },
      independent_contractor: { primary: "Company", secondary: "Contractor" },
      consulting_agreement: { primary: "Client", secondary: "Consultant" },
      safe_note: { primary: "Company", secondary: "Investor" },
      freelance_service: { primary: "Client", secondary: "Freelancer" },
    };

    const mapping = roleMap[contractType] || { primary: "party1", secondary: "party2" };
    const labels = roleLabelMap[contractType] || { primary: "Party 1", secondary: "Party 2" };

    const primary = meta[mapping.primary] as { name?: string; email?: string } | undefined;
    const secondary = meta[mapping.secondary] as { name?: string; email?: string } | undefined;

    return [
      {
        id: "signer-0",
        role: labels.primary,
        name: primary?.name || "",
        email: primary?.email || "",
        company: "",
        color: SIGNER_COLORS[0],
      },
      {
        id: "signer-1",
        role: labels.secondary,
        name: secondary?.name || "",
        email: secondary?.email || "",
        company: "",
        color: SIGNER_COLORS[1],
      },
    ];
  };

  // Fetch contract
  useEffect(() => {
    async function fetchContract() {
      try {
        const response = await fetch(`/api/contracts/${contractId}`);
        if (!response.ok) throw new Error("Contract not found");
        const data = await response.json();
        setContract(data.contract);

        // Mark onboarding step complete
        completeStep("preview_contract");

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

        // Initialize payment settings from contract
        if (data.contract) {
          setPaymentRequired(data.contract.payment_required || false);
          setPaymentAmount(data.contract.payment_amount ? String(data.contract.payment_amount) : "");
          setPaymentCurrency(data.contract.payment_currency || "usd");
          setPaymentStructure(data.contract.payment_structure || "full");
          setDepositPercentage(data.contract.deposit_percentage ? String(data.contract.deposit_percentage) : "30");
          // Initialize balance due date (convert to YYYY-MM-DD for input)
          if (data.contract.balance_due_date) {
            const dueDate = new Date(data.contract.balance_due_date);
            setBalanceDueDate(dueDate.toISOString().split("T")[0]);
          }

          // Load saved defined signers from metadata, or extract from party info
          if (data.contract.metadata?.defined_signers) {
            setDefinedSigners(data.contract.metadata.defined_signers);
          } else {
            // Pre-fill from contract metadata (party_a/party_b data from generation)
            const extractedSigners = extractSignersFromMetadata(data.contract);
            // Only set if we have actual data (at least one email or name)
            const hasData = extractedSigners.some(s => s.name || s.email);
            if (hasData) {
              setDefinedSigners(extractedSigners);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId, completeStep]);

  // Fetch current user ID for comments
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user?.id || null);
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    }
    fetchCurrentUser();
  }, []);

  // Fetch all comments (for highlights and counts)
  const fetchAllComments = useCallback(async () => {
    try {
      // Fetch all comments including resolved ones for highlights
      const response = await fetch(`/api/contracts/${contractId}/comments?includeResolved=true`);
      if (response.ok) {
        const data = await response.json();
        setCommentCounts(data.commentCounts || {});
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  }, [contractId]);

  // Fetch comments on mount and when sidebar opens
  useEffect(() => {
    if (contract) {
      fetchAllComments();
    }
  }, [contract, fetchAllComments]);

  // Refresh comments when sidebar is opened to keep highlights in sync
  useEffect(() => {
    if (showComments && contract) {
      fetchAllComments();
    }
  }, [showComments, contract, fetchAllComments]);

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
    setEditedTitle(clause.title);
  };

  // Save edited clause
  const saveClauseEdit = async () => {
    if (!contract || !editingClause) return;

    const updatedClauses = contract.content.clauses.map((c) =>
      c.id === editingClause
        ? {
          ...c,
          title: editedTitle,
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
    setEditedTitle("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingClause(null);
    setEditedTitle("");
    setEditedContent("");
  };

  // Remove a clause (with undo support)
  const removeClause = (clauseId: string) => {
    if (!contract) return;

    // Find the clause and its index before removing
    const clauseIndex = contract.content.clauses.findIndex((c) => c.id === clauseId);
    const clauseToDelete = contract.content.clauses[clauseIndex];

    if (!clauseToDelete) return;

    // Store for undo
    setDeletedClause({ clause: clauseToDelete, index: clauseIndex });

    // Clear any existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Auto-dismiss undo toast after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedClause(null);
    }, 5000);

    const updatedClauses = contract.content.clauses.filter((c) => c.id !== clauseId);
    setContract({
      ...contract,
      content: { ...contract.content, clauses: updatedClauses },
    });

    // Remove from expanded set
    setExpandedClauses((prev) => {
      const newSet = new Set(prev);
      newSet.delete(clauseId);
      return newSet;
    });
  };

  // Undo clause deletion
  const undoDelete = () => {
    if (!contract || !deletedClause) return;

    // Clear the timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Insert the clause back at its original position
    const updatedClauses = [...contract.content.clauses];
    updatedClauses.splice(deletedClause.index, 0, deletedClause.clause);

    setContract({
      ...contract,
      content: { ...contract.content, clauses: updatedClauses },
    });

    // Re-expand the restored clause
    setExpandedClauses((prev) => new Set([...prev, deletedClause.clause.id]));

    // Clear the deleted clause state
    setDeletedClause(null);
  };

  // Add a new clause
  const addClause = () => {
    if (!contract) return;
    const newClause: Clause = {
      id: `clause-${Date.now()}`,
      title: "New Clause",
      content: "Enter clause content here...",
      type: "negotiable",
      order: contract.content.clauses.length + 1,
      isEdited: true,
    };
    const updatedClauses = [...contract.content.clauses, newClause];
    setContract({
      ...contract,
      content: { ...contract.content, clauses: updatedClauses },
    });
    // Auto-expand and start editing the new clause
    setExpandedClauses((prev) => new Set([...prev, newClause.id]));
    setEditingClause(newClause.id);
    setEditedTitle(newClause.title);
    setEditedContent(newClause.content);
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

  const refreshSignatureData = async () => {
    const response = await fetch(`/api/contracts/${contractId}`);
    if (!response.ok) return;
    const data = await response.json();

    if (Array.isArray(data.signatureRequests)) {
      setSignatureRequests(data.signatureRequests);
    }
    if (Array.isArray(data.signatures)) {
      setSignatures(data.signatures);
    }
    if (Array.isArray(data.fieldValues)) {
      setFieldValues(data.fieldValues);
    }
  };

  // Resend signature request
  const handleResendRequest = async (requestId: string): Promise<void> => {
    const response = await fetch(`/api/contracts/${contractId}/reminders/${requestId}`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message =
        data?.message ||
        data?.error ||
        "Failed to resend signing request";
      throw new Error(message);
    }

    await refreshSignatureData();
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

  // Modify clause with AI (now handled through ContractChat component)
  const modifyClauseWithAI = async (clauseId: string, instruction: string) => {
    if (!contract) return;
    // Open chat panel with context for the modification
    openPanel('chat');
    const clause = contract.content.clauses.find(c => c.id === clauseId);
    if (clause) {
      setChatContext({ text: clause.content, action: instruction });
    }
  };

  // Apply filled blanks to content string
  const applyFilledBlanks = (content: string, sectionId: string): string => {
    const blankPattern = /_{5,}/g;
    let blankIndex = 0;
    return content.replace(blankPattern, () => {
      const blankKey = `${sectionId}-blank-${blankIndex}`;
      const filledValue = filledBlanks.get(blankKey);
      blankIndex++;
      // Keep the underscores if not filled, otherwise use the value
      return filledValue || "_____";
    });
  };

  // Save entire contract
  const saveContract = async () => {
    if (!contract) return;
    setSaving(true);
    setSaved(false);

    // Apply filled blanks to all content sections
    const updatedContent = {
      ...contract.content,
      preamble: applyFilledBlanks(contract.content.preamble, "preamble"),
      recitals: contract.content.recitals
        ? applyFilledBlanks(contract.content.recitals, "recitals")
        : contract.content.recitals,
      clauses: contract.content.clauses.map(clause => ({
        ...clause,
        content: applyFilledBlanks(clause.content, clause.id),
      })),
    };

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: updatedContent,
          version: (contract.version || 0) + 1,
          // Payment settings
          payment_required: paymentRequired,
          payment_amount: paymentAmount ? parseFloat(paymentAmount) : null,
          payment_currency: paymentCurrency,
          payment_structure: paymentStructure,
          deposit_percentage: paymentStructure === "deposit_balance" ? parseInt(depositPercentage) : null,
          balance_due_date: paymentStructure === "deposit_balance" && balanceDueDate
            ? new Date(balanceDueDate).toISOString()
            : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      const data = await response.json();
      setContract(data.contract);
      // Clear filled blanks since they're now embedded in the content
      setFilledBlanks(new Map());
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
    setDownloadError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/pdf`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF");
      }

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
      console.error("PDF download error:", err);
      setDownloadError(err instanceof Error ? err.message : "Failed to download PDF");
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloading(false);
    }
  };

  // Fetch risk analysis
  const fetchRiskAnalysis = async (forceRefresh = false) => {
    // Check subscription on frontend first to avoid unnecessary API call and loading state
    if (!subscription.hasRiskAnalysis) {
      setRiskError("Risk Analysis is a Pro feature. Upgrade to access AI-powered contract risk analysis.");
      return;
    }

    setRiskLoading(true);
    setRiskError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle upgrade required (403) with specific message
        if (response.status === 403 && data.upgradeRequired) {
          throw new Error(data.message || "Risk Analysis is a Pro feature. Upgrade to access.");
        }
        throw new Error(data.error || "Failed to analyze contract");
      }
      setRiskAnalysis(data.analysis);
    } catch (err) {
      setRiskError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRiskLoading(false);
    }
  };

  // Jump to a clause and highlight it
  const jumpToClause = (clauseId: string) => {
    // Expand the clause if collapsed
    setExpandedClauses((prev) => new Set([...prev, clauseId]));
    // Scroll to the clause
    const element = document.getElementById(`clause-${clauseId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Briefly highlight the clause
      element.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-amber-400");
      }, 2000);
    }
  };

  // Get clause risk indicator for a specific clause
  const getClauseRiskLevel = (clauseId: string): "critical" | "warning" | null => {
    if (!riskAnalysis) return null;
    const clauseRisks = riskAnalysis.clauseRisks.filter((r) => r.clauseId === clauseId);
    const jurisdictionRisks = riskAnalysis.jurisdictionAlerts.filter(
      (r) => r.affectedClauseId === clauseId
    );
    const allRisks = [...clauseRisks, ...jurisdictionRisks];
    if (allRisks.some((r) => r.severity === "critical")) return "critical";
    if (allRisks.some((r) => r.severity === "warning")) return "warning";
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
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
          <Link href="/dashboard" className="text-[#529ec6] hover:underline">
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
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-slate-900 text-sm truncate max-w-[150px] sm:max-w-[250px] lg:max-w-none">{contract.title}</h1>
                <p className="text-xs text-slate-500 truncate">
                  Version {contract.version} • {
                    {
                      draft: "Draft",
                      pending_signature: "Awaiting Signature",
                      signed: "Signed",
                      completed: "Completed",
                      expired: "Expired",
                      cancelled: "Cancelled",
                    }[contract.status] || contract.status
                  }
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <TagInput contractId={contract.id} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Payment Settings */}
              <button
                onClick={() => togglePanel('paymentSettings')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${showPaymentSettings
                  ? "bg-emerald-600 text-white"
                  : paymentRequired
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {paymentRequired ? `$${paymentAmount || 0}` : "Payment"}
                </span>
              </button>

              {/* AI Chat Toggle */}
              <button
                onClick={() => togglePanel('chat')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${showChat
                  ? "bg-[#529ec6] text-white"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI</span>
              </button>

              {/* Risk Analysis */}
              <button
                onClick={() => {
                  if (showRiskAnalysis) {
                    closePanel('riskAnalysis');
                  } else {
                    openPanel('riskAnalysis');
                    if (!riskAnalysis) fetchRiskAnalysis();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${showRiskAnalysis
                  ? "bg-amber-500 text-white"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">Risk</span>
              </button>

              {/* Review Panel - hide for sign_only contracts */}
              {contract.processing_mode !== "sign_only" && (
                <button
                  onClick={() => togglePanel('reviewPanel')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${showReviewPanel
                    ? "bg-[#202e46] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Review</span>
                </button>
              )}

              {/* Signature Fields - prominent button for sign_only contracts */}
              {contract.processing_mode === "sign_only" && !isLocked && (
                <button
                  onClick={() => setShowDefineSigners(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all bg-[#529ec6] text-white hover:bg-[#4a8db3]"
                >
                  <PenTool className="w-4 h-4" />
                  <span className="hidden sm:inline">Place Fields</span>
                </button>
              )}

              {/* Fill Blanks - only show if there are blanks and not locked */}
              {blankCounts.total > 0 && !isLocked && (
                <button
                  onClick={() => togglePanel('fillBlanksPanel')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${showFillBlanksPanel
                    ? "bg-amber-500 text-white"
                    : blankCounts.filled === blankCounts.total
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">Blanks</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${showFillBlanksPanel
                    ? "bg-white/20"
                    : blankCounts.filled === blankCounts.total
                      ? "bg-emerald-200/60"
                      : "bg-amber-200/60"
                    }`}>
                    {blankCounts.filled}/{blankCounts.total}
                  </span>
                </button>
              )}

              {/* Section Guide */}
              <button
                onClick={() => togglePanel('sectionExplainer')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${showSectionExplainer
                  ? "bg-[#529ec6] text-white"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
                title="Section explanations"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Guide</span>
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-slate-200 mx-1" />

              {/* More Dropdown */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${showToolsMenu
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showToolsMenu && (
                  <div className="absolute right-0 lg:right-[420px] top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-[100] animate-in fade-in zoom-in-95 duration-100">
                    {/* Save action - hidden when locked */}
                    {!isLocked && (
                      <button
                        onClick={() => {
                          saveContract();
                          setShowToolsMenu(false);
                        }}
                        disabled={saving}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Save className="w-4 h-4 text-slate-400" />
                        )}
                        {saved ? "Saved!" : "Save Changes"}
                      </button>
                    )}

                    {/* Locked indicator in menu */}
                    {isLocked && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600">
                        <Lock className="w-4 h-4" />
                        Contract Locked
                      </div>
                    )}

                    <div className="my-1.5 border-t border-slate-100" />

                    {/* Contract Setup */}
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Contract Setup
                    </div>

                    {paymentRequired && (
                      <button
                        onClick={() => {
                          togglePanel('invoicePanel');
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        Invoices
                      </button>
                    )}

                    {!isLocked && (
                      <button
                        onClick={() => {
                          // For sign_only contracts, use visual PDF field editor
                          if (contract.processing_mode === "sign_only") {
                            setShowDefineSigners(true);
                          } else {
                            setIsEditingFields(!isEditingFields);
                          }
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <PenTool className="w-4 h-4 text-slate-400" />
                          Signature Fields
                        </span>
                        {isEditingFields && (
                          <span className="text-xs bg-[#529ec6]/10 text-[#202e46] px-1.5 py-0.5 rounded-full">
                            Editing
                          </span>
                        )}
                      </button>
                    )}

                    {blankCounts.total > 0 && !isLocked && (
                      <button
                        onClick={() => {
                          togglePanel('fillBlanksPanel');
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-amber-500" />
                          Fill Blanks
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${blankCounts.filled === blankCounts.total
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                          }`}>
                          {blankCounts.filled}/{blankCounts.total}
                        </span>
                      </button>
                    )}

                    {signatureRequests.length > 0 && (
                      <button
                        onClick={() => {
                          togglePanel('signerPanel');
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          Signer Status
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {signatureRequests.filter((r) => r.status === "signed").length}/{signatureRequests.length}
                        </span>
                      </button>
                    )}

                    <div className="my-1.5 border-t border-slate-100" />

                    {/* Collaboration */}
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Collaboration
                    </div>

                    <button
                      onClick={() => {
                        openPanel('comments');
                        setShowToolsMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        Comments
                      </span>
                      {Object.values(commentCounts).reduce((a, b) => a + b, 0) > 0 && (
                        <span className="text-xs bg-[#529ec6]/10 text-[#202e46] px-1.5 py-0.5 rounded-full">
                          {Object.values(commentCounts).reduce((a, b) => a + b, 0)}
                        </span>
                      )}
                    </button>

                    {contract.status === "draft" && (
                      <button
                        onClick={() => {
                          setShowShareModal(true);
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                        Share for Review
                      </button>
                    )}

                    <div className="my-1.5 border-t border-slate-100" />

                    {/* History & Export */}
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      History & Export
                    </div>

                    <button
                      onClick={() => {
                        openPanel('versionHistory');
                        setShowToolsMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      Version History
                    </button>

                    <Link
                      href={`/contracts/${contractId}/audit`}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <History className="w-4 h-4 text-slate-400" />
                      Audit Trail
                    </Link>

                    <button
                      onClick={() => {
                        downloadPDF();
                        setShowToolsMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      Download PDF
                    </button>

                    <button
                      onClick={() => {
                        setShowTemplateModal(true);
                        setShowToolsMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <FileStack className="w-4 h-4 text-[#529ec6]" />
                      Save as Template
                    </button>
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <Link
                href={`/contracts/${contractId}/sign`}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Locked Contract Banner */}
      {isLocked && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                This contract is locked
              </p>
              <p className="text-xs text-amber-600">
                {contract?.status === "pending_signature" && "This contract has been sent for signature and cannot be edited to maintain document integrity."}
                {contract?.status === "signed" && "This contract has been signed and cannot be modified."}
                {contract?.status === "completed" && "This contract is complete and archived."}
                {contract?.status === "expired" && "This contract has expired."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                {contract?.status && {
                  draft: "Draft",
                  pending_signature: "Awaiting Signature",
                  signed: "Signed",
                  completed: "Completed",
                  expired: "Expired",
                  cancelled: "Cancelled",
                }[contract.status] || contract?.status?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contract Editor */}
        <main
          className="flex-1 overflow-auto p-4 lg:p-6"
        >
          <div className="max-w-4xl mx-auto">
            {/* Payment Settings Panel */}
            {showPaymentSettings && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-slate-900">Payment Settings</h3>
                  </div>
                  <button
                    onClick={() => setShowPaymentSettings(false)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {/* Require Payment Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-slate-900">Require Payment</label>
                      <p className="text-sm text-slate-500">Collect payment before or after signing</p>
                    </div>
                    <button
                      onClick={() => setPaymentRequired(!paymentRequired)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${paymentRequired ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${paymentRequired ? "translate-x-6" : ""
                          }`}
                      />
                    </button>
                  </div>

                  {paymentRequired && (
                    <>
                      {/* Amount and Currency */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="number"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Currency
                          </label>
                          <select
                            value={paymentCurrency}
                            onChange={(e) => setPaymentCurrency(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          >
                            <option value="usd">USD ($)</option>
                            <option value="eur">EUR (€)</option>
                            <option value="gbp">GBP (£)</option>
                          </select>
                        </div>
                      </div>

                      {/* Payment Structure */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Payment Structure
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setPaymentStructure("full")}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${paymentStructure === "full"
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <p className="font-medium text-slate-900">Full Payment</p>
                            <p className="text-xs text-slate-500 mt-1">Pay 100% upfront</p>
                          </button>
                          <button
                            onClick={() => setPaymentStructure("deposit_balance")}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${paymentStructure === "deposit_balance"
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <p className="font-medium text-slate-900">Deposit + Balance</p>
                            <p className="text-xs text-slate-500 mt-1">Split payment</p>
                          </button>
                          <button
                            onClick={() => setPaymentStructure("bnpl")}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${paymentStructure === "bnpl"
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <p className="font-medium text-slate-900">Buy Now, Pay Later</p>
                            <p className="text-xs text-slate-500 mt-1">Klarna / Afterpay</p>
                          </button>
                        </div>
                      </div>

                      {/* Deposit Percentage (only for deposit_balance) */}
                      {paymentStructure === "deposit_balance" && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Deposit Percentage
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="10"
                              max="90"
                              step="5"
                              value={depositPercentage}
                              onChange={(e) => setDepositPercentage(e.target.value)}
                              className="flex-1"
                            />
                            <span className="w-16 text-center font-medium text-slate-900">
                              {depositPercentage}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>Deposit: ${((parseFloat(paymentAmount) || 0) * parseInt(depositPercentage) / 100).toFixed(2)}</span>
                            <span>Balance: ${((parseFloat(paymentAmount) || 0) * (100 - parseInt(depositPercentage)) / 100).toFixed(2)}</span>
                          </div>

                          {/* Balance Due Date */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Balance Due Date
                              <span className="text-slate-400 font-normal ml-1">(for auto-reminders)</span>
                            </label>
                            <input
                              type="date"
                              value={balanceDueDate}
                              onChange={(e) => setBalanceDueDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Automatic payment reminders will be sent 7, 3, and 1 days before this date.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Info Box */}
                      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Payment Collection</p>
                          <p className="mt-1">
                            {paymentStructure === "full" && "The signer will pay the full amount before or after signing, based on your preference."}
                            {paymentStructure === "deposit_balance" && `The signer will pay ${depositPercentage}% deposit upfront, and the remaining ${100 - parseInt(depositPercentage)}% upon completion.`}
                            {paymentStructure === "bnpl" && "The signer can pay in installments via Klarna or Afterpay. You receive the full amount immediately."}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contract Document */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Title */}
              <div className="px-8 py-6 border-b border-slate-100 text-center">
                <h2 className="text-2xl font-bold text-slate-900">
                  {contract.title}
                </h2>
                {contract.source_type === "uploaded" && (
                  <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    <Upload className="w-3.5 h-3.5" />
                    Uploaded Document
                  </span>
                )}
              </div>

              {/* Sign Only Mode: Show original PDF */}
              {contract.processing_mode === "sign_only" && contract.source_file_url ? (
                <div className="p-4">
                  <div className="mb-4 flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Sign Only Mode</p>
                      <p className="mt-1">
                        This is your original document. Click the &quot;Place Fields&quot; button above to visually place signature fields on the PDF, then send for signatures.
                      </p>
                    </div>
                  </div>
                  <EmbeddedPDFViewer
                    pdfUrl={contract.source_file_url}
                  />
                </div>
              ) : (
                <>
                  {/* Preamble */}
                  <div className="px-8 py-6 border-b border-slate-100">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {renderClauseContent(contract.content.preamble, "preamble")}
                    </p>
                  </div>

                  {/* Recitals */}
                  {contract.content.recitals && (
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">
                        Recitals
                      </h3>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {renderClauseContent(contract.content.recitals, "recitals")}
                      </p>
                    </div>
                  )}

                  {/* Clauses */}
                  <div className="divide-y divide-slate-100 relative">
                    {/* Calculate which clauses to show fully vs blur */}
                    {(() => {
                      const clauses = contract.content.clauses;
                      const midpoint = Math.ceil(clauses.length / 2);
                      const visibleClauses = showPaywall ? clauses.slice(0, midpoint) : clauses;
                      const blurredClauses = showPaywall ? clauses.slice(midpoint) : [];

                      return (
                        <>
                          {/* Visible clauses */}
                          {visibleClauses.map((clause) => (
                            <div
                              key={clause.id}
                              id={`clause-${clause.id}`}
                              className={`transition-all ${activeClause === clause.id ? "bg-[#529ec6]/5" : ""
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
                                  {/* Risk indicator */}
                                  {getClauseRiskLevel(clause.id) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowRiskAnalysis(true);
                                        setShowChat(false);
                                        setShowComments(false);
                                        setShowSignerPanel(false);
                                        setShowFillBlanksPanel(false);
                                        setShowVersionHistory(false);
                                        setShowReviewPanel(false);
                                      }}
                                      className={`p-1 rounded-full ${getClauseRiskLevel(clause.id) === "critical"
                                        ? "bg-red-100 hover:bg-red-200"
                                        : "bg-amber-100 hover:bg-amber-200"
                                        }`}
                                      title="View risks for this clause"
                                    >
                                      <AlertTriangle className={`w-3.5 h-3.5 ${getClauseRiskLevel(clause.id) === "critical"
                                        ? "text-red-500"
                                        : "text-amber-500"
                                        }`} />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Comment indicator */}
                                  <CommentIndicator
                                    count={commentCounts[clause.id] || 0}
                                    isActive={showComments && activeCommentClause === clause.id}
                                    onClick={() => {
                                      setActiveCommentClause(clause.id);
                                      setShowComments(true);
                                      setShowChat(false);
                                      setShowSignerPanel(false);
                                      setShowFillBlanksPanel(false);
                                      setShowVersionHistory(false);
                                      setShowReviewPanel(false);
                                    }}
                                  />
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
                                  {!isLocked && (
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
                                  )}
                                  {!isLocked && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Require confirmation for standard clauses, quick delete for others
                                        if (clause.type === "standard") {
                                          if (confirm(`"${clause.title}" is a standard clause that's typically required in this type of contract.\n\nAre you sure you want to remove it?`)) {
                                            removeClause(clause.id);
                                          }
                                        } else {
                                          removeClause(clause.id);
                                        }
                                      }}
                                      className="p-2 hover:bg-red-100 rounded-lg"
                                      title={clause.type === "standard" ? "Remove standard clause (confirmation required)" : "Remove this clause"}
                                    >
                                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                    </button>
                                  )}
                                  {isLocked && (
                                    <div className="p-2" title="Contract is locked">
                                      <Lock className="w-4 h-4 text-amber-500" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Clause Content */}
                              {expandedClauses.has(clause.id) && (
                                <div className="px-8 pb-6">
                                  {editingClause === clause.id ? (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                          Clause Title
                                        </label>
                                        <input
                                          type="text"
                                          value={editedTitle}
                                          onChange={(e) => setEditedTitle(e.target.value)}
                                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent text-sm font-semibold"
                                          placeholder="Enter clause title..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                          Clause Content
                                        </label>
                                        <textarea
                                          value={editedContent}
                                          onChange={(e) => setEditedContent(e.target.value)}
                                          className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none font-mono text-sm"
                                          placeholder="Enter clause content..."
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={saveClauseEdit}
                                          className="flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539]"
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
                                      <HighlightedClauseContent
                                        clauseId={clause.id}
                                        content={clause.content}
                                        comments={comments.filter(c => c.clause_id === clause.id)}
                                        onHighlightClick={(commentId) => handleHighlightClick(commentId, clause.id)}
                                        onTextSelect={handleHighlightedTextSelect}
                                        className="text-slate-700 leading-relaxed select-text"
                                        filledBlanks={filledBlanks}
                                        onBlankChange={handleBlankChange}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Blurred clauses with paywall */}
                          {blurredClauses.length > 0 && (
                            <div className="relative min-h-[400px]">
                              {/* Blurred content preview */}
                              <div className="blur-sm pointer-events-none select-none opacity-50">
                                {blurredClauses.map((clause) => (
                                  <div key={clause.id} className="px-8 py-4 border-t border-slate-100">
                                    <div className="flex items-center gap-3 mb-2">
                                      <ChevronRight className="w-5 h-5 text-slate-400" />
                                      <span className="font-semibold text-slate-900">{clause.title}</span>
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                                        {clause.type}
                                      </span>
                                    </div>
                                    <div className="pl-8 text-slate-700 leading-relaxed line-clamp-3">
                                      {clause.content.substring(0, 200)}...
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Paywall overlay */}
                              <ContractPaywall
                                type="contract_limit"
                                currentUsage={subscription.aiContractsUsed}
                                limit={subscription.aiContractsLimit}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Add Clause Button - hidden when locked or paywalled */}
                    {!isLocked && !showPaywall && (
                      <button
                        onClick={addClause}
                        className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-[#529ec6] hover:bg-[#529ec6]/5 rounded-lg transition-colors flex items-center justify-center gap-2 text-slate-500 hover:text-[#529ec6]"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add Clause</span>
                      </button>
                    )}
                  </div>

                  {/* Signature Block / Field Editor */}
                  {isEditingFields ? (
                    <div className="px-8 py-6 bg-white border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase">
                          Configure Signature Fields
                        </h3>
                        <FieldTemplateEditor
                          contractId={contractId}
                          contractType={contract.type}
                          currentFields={signatureFields}
                          onApplyTemplate={(newFields) => {
                            setSignatureFields((prev) => [...prev, ...newFields]);
                          }}
                        />
                      </div>
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
                    <>
                      <SignatureBlockDisplay
                        signatureBlock={contract.content.signatureBlock}
                        fields={dbSignatureFields}
                        fieldValues={fieldValues}
                        signatures={signatures}
                        signatureRequests={signatureRequests}
                        showPlaceholders={true}
                      />
                      <div className="px-8 pb-8">
                        <AIDisclaimer />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* AI Chat Sidebar */}
        {showChat && (
          <aside className="fixed inset-0 z-50 lg:relative lg:inset-auto w-full lg:w-96 flex-shrink-0 bg-white lg:border-l border-slate-200 flex flex-col">
            {/* Close button for mobile */}
            <div className="absolute top-2 right-2 lg:hidden z-10">
              <button
                onClick={() => setShowChat(false)}
                className="p-1 bg-white rounded-full shadow hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <ContractChat
              contractId={contractId}
              onContractUpdated={async () => {
                // Refresh contract data after AI modification
                try {
                  const response = await fetch(`/api/contracts/${contractId}`);
                  if (response.ok) {
                    const data = await response.json();
                    setContract(data.contract);
                  }
                } catch (err) {
                  console.error("Failed to refresh contract:", err);
                }
              }}
              onJumpToClause={(clauseId) => {
                setActiveClause(clauseId);
                const element = document.getElementById(`clause-${clauseId}`);
                element?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              contextText={chatContext?.text}
              onClearContext={() => setChatContext(null)}
            />
          </aside>
        )}

        {/* Fill Blanks Sidebar */}
        {showFillBlanksPanel && (
          <aside className="fixed inset-0 z-50 lg:relative lg:inset-auto w-full lg:w-96 flex-shrink-0 bg-white lg:border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-slate-900">Fill Blanks</span>
                </div>
                <button
                  onClick={() => setShowFillBlanksPanel(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{blankCounts.filled} of {blankCounts.total} completed</span>
                  <span>{Math.round((blankCounts.filled / blankCounts.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-300"
                    style={{ width: `${(blankCounts.filled / blankCounts.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Blanks List */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {allBlanks.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <p className="font-medium">All blanks filled!</p>
                  <p className="text-sm mt-1">Your contract is ready.</p>
                </div>
              ) : (
                allBlanks.map((blank, idx) => {
                  const isFilled = !!filledBlanks.get(blank.key);
                  return (
                    <div
                      key={blank.key}
                      className={`p-3 rounded-lg border transition-all ${isFilled
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                        }`}
                    >
                      {/* Header with section label and jump button */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isFilled ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {blank.sectionTitle}
                          </span>
                        </div>
                        <button
                          onClick={() => scrollToBlank(blank.key)}
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${isFilled
                            ? "text-emerald-600 hover:bg-emerald-100"
                            : "text-amber-600 hover:bg-amber-100"
                            }`}
                        >
                          Jump to ↓
                        </button>
                      </div>

                      {/* Context preview */}
                      <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                        <span className="text-slate-400">{blank.contextBefore}</span>
                        <span className={`font-semibold mx-1 ${isFilled ? "text-emerald-600" : "text-amber-600"}`}>
                          {filledBlanks.get(blank.key) || "_____"}
                        </span>
                        <span className="text-slate-400">{blank.contextAfter}</span>
                      </p>

                      {/* Input field */}
                      <input
                        type="text"
                        value={filledBlanks.get(blank.key) || ""}
                        onChange={(e) => handleBlankChange(blank.key, e.target.value)}
                        placeholder="Enter value..."
                        className={`w-full px-3 py-2 text-sm rounded-md border transition-all focus:outline-none focus:ring-2 ${isFilled
                          ? "border-emerald-300 bg-white focus:ring-emerald-400"
                          : "border-amber-300 bg-white focus:ring-amber-400"
                          }`}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with actions */}
            {blankCounts.total > 0 && (
              <div className="p-4 border-t border-slate-200 flex-shrink-0">
                <button
                  onClick={() => {
                    // Clear all blanks
                    setFilledBlanks(new Map());
                  }}
                  className="w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Signer Status Sidebar */}
        {showSignerPanel && (
          <aside className="fixed inset-0 z-50 lg:relative lg:inset-auto w-full lg:w-96 flex-shrink-0 bg-white lg:border-l border-slate-200 flex flex-col overflow-hidden">
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

        {/* Version History Sidebar */}
        {showVersionHistory && contract && (
          <VersionHistoryPanel
            contractId={contractId}
            currentVersion={contract.version}
            onClose={() => {
              setShowVersionHistory(false);
              setPreviewVersion(null);
            }}
            onVersionPreview={(content) => {
              setPreviewVersion(content);
            }}
            onRollback={async (version) => {
              try {
                const response = await fetch(`/api/contracts/${contractId}/versions/rollback`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ targetVersionNumber: version.version_number }),
                });
                if (!response.ok) throw new Error("Failed to rollback");
                const data = await response.json();
                setContract(data.contract);
                setPreviewVersion(null);
              } catch (err) {
                console.error("Rollback error:", err);
                throw err;
              }
            }}
          />
        )}

        {/* Comments Sidebar */}
        {showComments && currentUserId && (
          <CommentSidebar
            contractId={contractId}
            currentUserId={currentUserId}
            isContractOwner={contract?.user_id === currentUserId}
            activeClauseId={activeCommentClause}
            clauseTitle={
              contract?.content.clauses.find((c) => c.id === activeCommentClause)?.title
            }
            selectedText={pendingCommentSelection?.text}
            selectionRange={
              pendingCommentSelection
                ? { start: pendingCommentSelection.start, end: pendingCommentSelection.end }
                : undefined
            }
            onClose={() => {
              setShowComments(false);
              setTextSelection(null);
              setPendingCommentSelection(null);
            }}
            onCommentCountChange={(counts) => setCommentCounts(counts)}
            onCommentCreated={() => {
              setPendingCommentSelection(null);
              fetchAllComments(); // Refresh highlights
            }}
            onJumpToSelection={handleJumpToSelection}
          />
        )}

        {/* Selection Popup for inline commenting and AI */}
        {textSelection && (
          <SelectionPopup
            position={textSelection.position}
            selectedText={textSelection.text}
            onAddComment={handleAddCommentFromSelection}
            onQuickAction={handleQuickAction}
            onAddToChat={handleAddToChat}
            onClose={() => setTextSelection(null)}
          />
        )}

        {/* Risk Analysis Sidebar */}
        {showRiskAnalysis && (
          <RiskAnalysisPanel
            contractId={contractId}
            onClose={() => setShowRiskAnalysis(false)}
            onJumpToClause={jumpToClause}
            onImplement={async (risk) => {
              // Get the suggestion and clause info
              const suggestion = "suggestion" in risk ? risk.suggestion : null;
              const clauseId = "clauseId" in risk ? risk.clauseId : ("affectedClauseId" in risk ? risk.affectedClauseId : null);

              if (!suggestion) {
                throw new Error("No suggestion available for this risk");
              }

              // Call AI to implement the fix
              const response = await fetch("/api/contracts/ai/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contractId,
                  instruction: `Implement this fix: ${suggestion}. Risk: ${risk.title} - ${risk.description}`,
                  clauseId: clauseId || undefined,
                }),
              });

              if (!response.ok) {
                throw new Error("Failed to implement fix");
              }

              const result = await response.json();

              // If the AI returned updated content, apply it
              if (result.updatedClause && clauseId && contract) {
                const updatedClauses = contract.content.clauses.map((c: Clause) =>
                  c.id === clauseId ? { ...c, content: result.updatedClause } : c
                );
                setContract({
                  ...contract,
                  content: { ...contract.content, clauses: updatedClauses },
                });

                // Save to backend
                await fetch(`/api/contracts/${contractId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    content: { ...contract.content, clauses: updatedClauses },
                  }),
                });
              }

              // Refresh risk analysis after implementing fix
              fetchRiskAnalysis(true);
            }}
            analysis={riskAnalysis}
            loading={riskLoading}
            error={riskError}
            onRefresh={() => fetchRiskAnalysis(true)}
          />
        )}

        {/* Invoice Panel Sidebar */}
        {showInvoicePanel && (
          <InvoicePanel
            contractId={contractId}
            onClose={() => setShowInvoicePanel(false)}
          />
        )}

        {/* Review Panel Sidebar */}
        {showReviewPanel && (
          <ReviewPanel
            contractId={contractId}
            onClose={() => closePanel('reviewPanel')}
          />
        )}

        {/* Section Explainer Sidebar */}
        {showSectionExplainer && contract && contract.content?.clauses?.length > 0 && (
          <SectionExplainer
            contractId={contractId}
            clauses={contract.content.clauses.map(c => ({
              id: c.id,
              title: c.title,
              content: c.content
            }))}
            activeClauseId={activeClause}
            onClose={() => closePanel('sectionExplainer')}
            onJumpToClause={jumpToClause}
          />
        )}
      </div>

      {/* Version Preview Banner */}
      {previewVersion && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Previewing older version
            </span>
            <button
              onClick={() => setPreviewVersion(null)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {deletedClause && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg">
            <span className="text-sm">
              Deleted &quot;{deletedClause.clause.title}&quot;
            </span>
            <button
              onClick={undoDelete}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              onClick={() => setDeletedClause(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Download Error Toast */}
      {downloadError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{downloadError}</span>
            <button
              onClick={() => setDownloadError(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share for Review Modal */}
      {showShareModal && contract && (
        <ShareForReviewModal
          contractId={contractId}
          contractTitle={contract.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Save as Template Modal */}
      {showTemplateModal && contract && (
        <SaveAsTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          contractType={contract.type}
          jurisdiction={contract.jurisdiction}
          content={contract.content}
          defaultName={contract.title}
          onSave={async (templateData) => {
            const response = await fetch("/api/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: templateData.name,
                description: templateData.description,
                type: contract.type,
                jurisdiction: contract.jurisdiction,
                content: contract.content,
                // Pass metadata so filled values can be converted back to placeholders
                metadata: contract.metadata,
                is_public: templateData.is_public,
              }),
            });
            if (!response.ok) {
              throw new Error("Failed to save template");
            }
          }}
        />
      )}

      {/* Define Signers Modal (pre-step before visual field editor) */}
      {showDefineSigners && contract && (
        <DefineSignersModal
          isOpen={showDefineSigners}
          initialRoles={getSignerRoles()}
          existingSigners={definedSigners.length > 0 ? definedSigners : undefined}
          onClose={() => setShowDefineSigners(false)}
          onConfirm={async (signers) => {
            // Save signers to contract metadata
            try {
              await fetch(`/api/contracts/${contractId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  metadata: {
                    ...contract.metadata,
                    defined_signers: signers,
                  },
                }),
              });
            } catch (e) {
              console.error("Failed to save signers:", e);
            }
            setDefinedSigners(signers);
            setShowDefineSigners(false);
            setShowVisualEditor(true);
          }}
        />
      )}

      {/* Visual Signature Field Editor Modal */}
      {showVisualEditor && contract && (
        <SignatureFieldEditorVisual
          contractId={contractId}
          pdfUrl={contract.processing_mode === "sign_only" && contract.source_file_url
            ? contract.source_file_url
            : `/api/contracts/${contractId}/pdf`}
          signers={definedSigners.length > 0
            ? definedSigners.map(s => ({ id: s.id, role: s.role, name: s.name, email: s.email }))
            : getSignerRoles().map((role, idx) => ({
              id: `signer-${idx}`,
              role,
              name: signatureRequests.find(sr => sr.signer_role === role)?.signer_name,
              email: signatureRequests.find(sr => sr.signer_role === role)?.signer_email,
            }))}
          initialFields={signatureFields.map((f) => ({
            id: f.id,
            type: f.type,
            signerId: `signer-${getSignerRoles().indexOf(f.signerRole)}`,
            signerRole: f.signerRole,
            page: f.page || 1,
            x: f.positionX,
            y: f.positionY,
            width: f.width,
            height: f.height,
            required: f.required,
            label: f.label,
          }))}
          onClose={() => setShowVisualEditor(false)}
          onSave={async (fields: PlacedFieldData[]) => {
            // Convert visual fields back to signature fields and save
            for (const field of fields) {
              const existingField = signatureFields.find((f) => f.id === field.id);
              if (existingField) {
                await handleFieldUpdate(field.id, {
                  positionX: field.x,
                  positionY: field.y,
                  width: field.width,
                  height: field.height,
                  page: field.page,
                });
              } else {
                await handleFieldCreate({
                  type: field.type,
                  signerRole: field.signerRole,
                  label: field.label || field.type,
                  required: field.required,
                  positionX: field.x,
                  positionY: field.y,
                  width: field.width,
                  height: field.height,
                  page: field.page,
                  order: signatureFields.length + 1,
                });
              }
            }
            // Delete fields that were removed
            const fieldIds = new Set(fields.map((f) => f.id));
            for (const existingField of signatureFields) {
              if (!fieldIds.has(existingField.id)) {
                await handleFieldDelete(existingField.id);
              }
            }
          }}
        />
      )}
    </div>
  );
}
