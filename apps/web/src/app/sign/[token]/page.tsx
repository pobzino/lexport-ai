"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PenTool,
  Eraser,
  Download,
  Type,
  Upload,
  X,
  Sparkles,
  Clock,
  Users,
  CheckSquare,
  Paperclip,
  Square,
  Calendar,
  CreditCard,
  DollarSign,
  Shield,
  Eye,
  Play,
  CheckCircle2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { PDFSigningView } from "@/components/pdf-signing-view";

// Signature font styles for "Select Style" mode
const SIGNATURE_FONTS = [
  { name: "Elegant", font: "'Dancing Script', cursive", weight: "400" },
  { name: "Classic", font: "'Great Vibes', cursive", weight: "400" },
  { name: "Modern", font: "'Pacifico', cursive", weight: "400" },
  { name: "Professional", font: "'Allura', cursive", weight: "400" },
  { name: "Simple", font: "'Caveat', cursive", weight: "700" },
];

interface Clause {
  id: string;
  title: string;
  content: string;
  type: string;
  order: number;
}

interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signatureBlock: string;
}

interface SignatureRequest {
  id: string;
  signerName: string;
  signerEmail: string;
  signerRole?: string;
  status: string;
  expiresAt: string;
  message?: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  content: ContractContent;
  contentHash?: string;
  contentHashAlgorithm?: string;
  requireSequentialSigning?: boolean;
  paymentRequired?: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentStatus?: string;
  paymentStructure?: "full" | "deposit_balance";
  depositPercentage?: number;
  depositPaid?: boolean;
  paymentSufficientForSigning?: boolean;
  // Sign-only contract fields
  processingMode?: "sign_only" | "edit_and_sign" | null;
  sourceFileUrl?: string | null;
}

// Signature field types
type FieldType = "signature" | "initials" | "date" | "text" | "checkbox" | "dropdown" | "attachment";

interface SignatureField {
  id: string;
  contract_id: string;
  type: FieldType;
  label?: string;
  signer_role: string;
  required: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  page?: number;
  order: number;
  options?: {
    choices?: string[];
    multiple?: boolean;
    default_value?: string;
  };
  placeholder?: string;
}

interface FieldValue {
  fieldId: string;
  value?: string;
  signatureData?: string;
  attachmentData?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    dataUrl: string;
  };
}

export default function SignContractPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [notYourTurn, setNotYourTurn] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signingProgress, setSigningProgress] = useState<{
    isSequential: boolean;
    currentSignerOrder: number;
    totalSigners: number;
    signers: { name: string; order: number; status: string; isCurrent: boolean }[];
  } | null>(null);

  // UI state
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [hasReadContract, setHasReadContract] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [identityConfirmationText, setIdentityConfirmationText] = useState<string>("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Guided navigation state
  type SigningStage = "welcome" | "signing" | "review";
  const [signingStage, setSigningStage] = useState<SigningStage>("welcome");

  // Payment state
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Email verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(10);
  const [maskedEmail, setMaskedEmail] = useState<string>("");

  // Signature fields state
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [myFields, setMyFields] = useState<SignatureField[]>([]);
  const [fieldValues, setFieldValues] = useState<Map<string, FieldValue>>(new Map());
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  // "Adopt Your Signature" modal state
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [adoptedSignature, setAdoptedSignature] = useState<string | null>(null);
  const [adoptedInitials, setAdoptedInitials] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);

  // Signature modes
  const [signatureMode, setSignatureMode] = useState<"style" | "draw" | "upload">("style");
  const [typedSignature, setTypedSignature] = useState("");
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Fetch signature request
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/sign/${token}`);

        if (!response.ok) {
          const data = await response.json();
          if (data.alreadySigned) {
            // If payment is pending, redirect to payment page
            if (data.paymentPending && data.contractId) {
              router.push(`/pay/${data.contractId}?token=${token}&signed=true`);
              return;
            }
            setAlreadySigned(true);
            throw new Error(data.error || "Already signed");
          }
          if (data.notYourTurn) {
            setNotYourTurn(true);
            setWaitingMessage(data.message);
            setLoading(false);
            return;
          }
          throw new Error(data.error || "Failed to load");
        }

        const data = await response.json();
        setSignatureRequest(data.signatureRequest);
        setContract(data.contract);

        // Set signing progress for sequential contracts
        if (data.signingProgress) {
          setSigningProgress(data.signingProgress);
        }

        // Set payment state
        if (data.contract?.paymentRequired) {
          setPaymentRequired(true);
          // Use paymentSufficientForSigning which accounts for deposit/balance payments
          if (data.contract.paymentSufficientForSigning || data.contract.paymentStatus === "succeeded") {
            setPaymentCompleted(true);
          }
        }

        // Pre-fill full name for signature adoption
        if (data.signatureRequest?.signerName) {
          setFullName(data.signatureRequest.signerName);
        }

        // Set identity confirmation text from API
        if (data.identityConfirmationText) {
          setIdentityConfirmationText(data.identityConfirmationText);
        }

        // Check if email is already verified
        if (data.signatureRequest?.emailVerified) {
          setEmailVerified(true);
        }

        // Store signature fields and filter by signer role
        if (data.signatureFields) {
          setSignatureFields(data.signatureFields);
          const signerRole = data.signatureRequest?.signerRole;
          const fieldsForMe = (data.signatureFields as SignatureField[])
            .filter((f) => !signerRole || f.signer_role === signerRole)
            .sort((a, b) => a.order - b.order);
          setMyFields(fieldsForMe);
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

    fetchData();
  }, [token, router]);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Touch event handlers for mobile signature drawing
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawingTouch = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Generate initials from full name (e.g., "James Smith" → "JS")
  const generateInitials = (name: string): string => {
    return name
      .split(" ")
      .filter((part) => part.length > 0)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  // Generate styled signature as canvas image
  const generateStyledSignature = (text: string, fontIndex: number, width = 300, height = 80): string => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const font = SIGNATURE_FONTS[fontIndex];
    ctx.font = `${font.weight} 36px ${font.font}`;
    ctx.fillStyle = "#1a365d"; // Dark blue like DocuSign
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  };

  // Generate initials image
  const generateInitialsImage = (initials: string, fontIndex: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 60;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const font = SIGNATURE_FONTS[fontIndex];
    ctx.font = `${font.weight} 24px ${font.font}`;
    ctx.fillStyle = "#1a365d";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  };

  // Generate typed signature as canvas image (legacy)
  const generateTypedSignature = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 32px 'Brush Script MT', cursive, serif";
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedSignature(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send email verification code
  const sendVerificationCode = async () => {
    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const response = await fetch(`/api/sign/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      // Check if already verified
      if (data.verified) {
        setEmailVerified(true);
        return;
      }

      setVerificationSent(true);
      setMaskedEmail(data.email || "");
      setVerificationExpiry(data.expiresInMinutes || 10);
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Verify the entered code
  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setVerificationError("Please enter a 6-digit code");
      return;
    }

    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const response = await fetch(`/api/sign/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      if (data.verified) {
        setEmailVerified(true);
      }
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Verification failed");
      setVerificationCode("");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Resend verification code
  const resendVerificationCode = async () => {
    setVerificationCode("");
    await sendVerificationCode();
  };

  // Check if current mode has a valid signature
  const hasValidSignature = (): boolean => {
    switch (signatureMode) {
      case "style":
        return fullName.trim().length >= 2;
      case "draw":
        return hasSignature;
      case "upload":
        return uploadedSignature !== null;
      default:
        return false;
    }
  };

  // "Adopt and Sign" - generate signature and auto-fill all fields
  const handleAdoptAndSign = () => {
    if (!fullName.trim()) return;

    let signatureData: string;
    let initialsData: string;

    if (signatureMode === "style") {
      signatureData = generateStyledSignature(fullName, selectedFontIndex);
      initialsData = generateInitialsImage(generateInitials(fullName), selectedFontIndex);
    } else if (signatureMode === "draw") {
      signatureData = canvasRef.current?.toDataURL("image/png") || "";
      // For drawn signatures, also generate styled initials
      initialsData = generateInitialsImage(generateInitials(fullName), 0);
    } else if (signatureMode === "upload" && uploadedSignature) {
      signatureData = uploadedSignature;
      initialsData = generateInitialsImage(generateInitials(fullName), 0);
    } else {
      return;
    }

    // Store adopted signature and initials
    setAdoptedSignature(signatureData);
    setAdoptedInitials(initialsData);

    // Auto-fill ALL fields for this signer
    const newFieldValues = new Map<string, FieldValue>();

    for (const field of myFields) {
      if (field.type === "signature") {
        newFieldValues.set(field.id, {
          fieldId: field.id,
          signatureData: signatureData,
        });
      } else if (field.type === "initials") {
        newFieldValues.set(field.id, {
          fieldId: field.id,
          signatureData: initialsData,
        });
      } else if (field.type === "date") {
        newFieldValues.set(field.id, {
          fieldId: field.id,
          value: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        });
      } else if (field.type === "text") {
        // Text fields need manual input, leave empty
        // Could auto-fill with name if label suggests it
        if (field.label?.toLowerCase().includes("name")) {
          newFieldValues.set(field.id, {
            fieldId: field.id,
            value: fullName,
          });
        }
      }
    }

    setFieldValues(newFieldValues);
    setShowAdoptModal(false);
  };

  // Check if all required fields are completed
  const allRequiredFieldsCompleted = (): boolean => {
    if (myFields.length === 0) return true;
    const requiredFields = myFields.filter((f) => f.required);
    return requiredFields.every((f) => fieldValues.has(f.id));
  };

  // Get current field being worked on
  const currentField = myFields[currentFieldIndex] || null;

  // Navigation helpers for guided flow
  const goToNextField = () => {
    if (currentFieldIndex < myFields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
      if (signatureMode === "draw") {
        clearSignature();
      }
    }
  };

  const goToPreviousField = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    }
  };

  const isLastField = currentFieldIndex === myFields.length - 1;
  const isFirstField = currentFieldIndex === 0;

  // Start signing flow
  const handleStartSigning = () => {
    if (myFields.length > 0) {
      setCurrentFieldIndex(0);
      setShowAdoptModal(true);
    }
    setSigningStage("signing");
  };

  // Complete current field and move to next
  const completeCurrentField = () => {
    if (!currentField) return;

    const signatureData = getSignatureData();
    const newFieldValues = new Map(fieldValues);

    if (currentField.type === "signature" || currentField.type === "initials") {
      newFieldValues.set(currentField.id, {
        fieldId: currentField.id,
        signatureData,
      });
    } else if (currentField.type === "date") {
      newFieldValues.set(currentField.id, {
        fieldId: currentField.id,
        value: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      });
    }

    setFieldValues(newFieldValues);

    // Move to next field
    if (currentFieldIndex < myFields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
      // Clear signature for next field
      if (signatureMode === "draw") {
        clearSignature();
      }
    }
  };

  // Check if field is completed
  const isFieldCompleted = (fieldId: string): boolean => {
    return fieldValues.has(fieldId);
  };

  // Get signature data based on current mode
  const getSignatureData = (): string => {
    switch (signatureMode) {
      case "draw":
        return canvasRef.current?.toDataURL("image/png") || "";
      case "style":
        return generateStyledSignature(fullName, selectedFontIndex);
      case "upload":
        return uploadedSignature || "";
      default:
        return "";
    }
  };

  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  const handleSign = async () => {
    // For field-guided flow, check all required fields are completed
    if (myFields.length > 0 && !allRequiredFieldsCompleted()) {
      setError("Please complete all required fields");
      return;
    }

    // For no-fields flow, check signature
    if (myFields.length === 0 && !hasValidSignature()) {
      setError("Please provide a signature");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the terms");
      return;
    }

    if (!identityConfirmed) {
      setError("Please confirm your identity");
      return;
    }

    // Get signature data - either from field values or direct signature
    let signatureData: string;
    if (myFields.length > 0) {
      // Get signature from the first signature field
      const signatureFieldValue = Array.from(fieldValues.values()).find(
        (v) => v.signatureData
      );
      signatureData = signatureFieldValue?.signatureData || "";
    } else {
      signatureData = getSignatureData();
    }

    if (!signatureData) {
      setError("Failed to capture signature");
      return;
    }

    setSigning(true);

    try {
      // Convert field values map to array for API
      const fieldValuesArray = Array.from(fieldValues.values());

      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData,
          // Map frontend "style" mode to API "type" value
          signatureType: signatureMode === "style" ? "type" : signatureMode,
          agreedToTerms: true,
          identityConfirmed: true,
          identityConfirmationText,
          documentHash: contract?.contentHash,
          fieldValues: fieldValuesArray,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign");
      }

      const data = await response.json();

      // Check if payment is required and not yet complete
      // Only redirect the PAYING party (Client/Company/Hiring Party), not the service provider
      if (paymentRequired && !paymentCompleted) {
        const signerRole = signatureRequest?.signerRole?.toLowerCase() || "";
        // These roles are typically the paying party
        const payingRoles = ["client", "company", "hiring party", "disclosing party", "investor"];
        // These roles are service providers who receive payment, not pay
        const nonPayingRoles = ["freelancer", "contractor", "consultant", "receiving party"];

        const isPayingRole = payingRoles.some(role => signerRole.includes(role));
        const isNonPayingRole = nonPayingRoles.some(role => signerRole.includes(role));

        // Only redirect to payment if this is a paying role
        if (isPayingRole && !isNonPayingRole) {
          // Include invoice ID if one was auto-generated
          const invoiceParam = data.invoiceId ? `&invoice=${data.invoiceId}` : "";
          window.location.href = `/pay/${contract?.id}?token=${token}&signed=true${invoiceParam}`;
          return;
        }
      }

      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#202e46] mx-auto mb-4" />
          <p className="text-slate-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Already Signed
          </h1>
          <p className="text-slate-600">
            This contract has already been signed. No further action is required.
          </p>
        </div>
      </div>
    );
  }

  if (notYourTurn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Waiting for Other Signers
          </h1>
          <p className="text-slate-600 mb-4">
            {waitingMessage || "This contract requires signatures in a specific order. Please wait for the previous signers to complete their signatures."}
          </p>
          <p className="text-sm text-slate-500">
            You&apos;ll receive an email notification when it&apos;s your turn to sign.
          </p>
        </div>
      </div>
    );
  }

  if (error || !contract || !signatureRequest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Unable to Load Contract
          </h1>
          <p className="text-slate-600">{error || "Contract not found"}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Contract Signed Successfully
          </h1>
          <p className="text-slate-600 mb-6">
            Thank you, {signatureRequest.signerName}. Your signature has been
            recorded and the other parties will be notified.
          </p>
          <p className="text-sm text-slate-500">
            A copy of the signed contract will be sent to {signatureRequest.signerEmail}
          </p>

          {returnTo && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link
                href={returnTo}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] transition-colors shadow-sm"
              >
                Return to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate progress for the progress bar (2 steps: welcome, signing)
  const totalSteps = 2;
  const currentStep = signingStage === "welcome" ? 1 : 2;
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/dark-logo.png"
                alt="Lexport"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              {/* Stage indicator */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className={`px-2.5 py-1 rounded-full ${signingStage === "welcome" ? "bg-[#202e46] text-white" : "bg-slate-100 text-slate-500"}`}>
                  1. Review
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <span className={`px-2.5 py-1 rounded-full ${signingStage === "signing" ? "bg-[#202e46] text-white" : "bg-slate-100 text-slate-500"}`}>
                  2. Sign
                </span>
              </div>
              <div className="text-sm text-slate-500">
                {signatureRequest.signerName}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#202e46] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* ==================== WELCOME STAGE ==================== */}
        {signingStage === "welcome" && (
          <div className="max-w-2xl mx-auto">
            {/* Welcome Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-50 to-white px-8 py-10 text-center border-b border-slate-100">
                <div className="w-16 h-16 bg-[#202e46]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[#202e46]" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  {contract.title}
                </h1>
                <p className="text-slate-500">
                  You&apos;ve been asked to sign this document
                </p>
              </div>

              {/* Document Details */}
              <div className="px-8 py-6 space-y-4">
                {/* Personal Message */}
                {signatureRequest.message && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-amber-800 mb-1">Message from sender:</p>
                    <p className="text-amber-700">{signatureRequest.message}</p>
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your Role</p>
                    <p className="font-medium text-slate-900">{signatureRequest.signerRole || "Signer"}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Document Type</p>
                    <p className="font-medium text-slate-900">{contract.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fields to Complete</p>
                    <p className="font-medium text-slate-900">{myFields.length} field{myFields.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expires</p>
                    <p className="font-medium text-slate-900">
                      {new Date(signatureRequest.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Sequential signing progress */}
                {signingProgress && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Signing Order</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {signingProgress.signers.map((signer, index) => (
                        <div key={index} className="flex items-center">
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${signer.status === "signed"
                              ? "bg-emerald-100 text-emerald-700"
                              : signer.isCurrent
                                ? "bg-[#202e46] text-white"
                                : "bg-slate-200 text-slate-500"
                              }`}
                          >
                            {signer.status === "signed" && <Check className="w-3 h-3" />}
                            {signer.name.split(" ")[0]}
                          </div>
                          {index < signingProgress.signers.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment notice - informational only, payment collected after signing */}
                {paymentRequired && (
                  <div className={`rounded-xl p-4 flex items-start gap-3 ${paymentCompleted ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
                    <CreditCard className={`w-5 h-5 flex-shrink-0 mt-0.5 ${paymentCompleted ? "text-emerald-600" : "text-blue-600"}`} />
                    <div>
                      <p className={`font-medium ${paymentCompleted ? "text-emerald-900" : "text-blue-900"}`}>
                        {paymentCompleted ? "Payment Complete" : "Payment Information"}
                      </p>
                      <p className={`text-sm ${paymentCompleted ? "text-emerald-700" : "text-blue-700"}`}>
                        {paymentCompleted
                          ? "Your payment has been received."
                          : `A payment of ${new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: contract?.paymentCurrency || "usd",
                            }).format(contract?.paymentAmount || 0)} will be collected after you sign.`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Security note */}
                <div className="flex items-start gap-3 text-sm text-slate-500">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Your signature is legally binding and protected with bank-level encryption.</p>
                </div>
              </div>

              {/* Email Verification Section */}
              {!emailVerified && (
                <div className="px-8 py-6 border-t border-slate-100">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-1">Verify Your Email</h3>
                        <p className="text-sm text-blue-700 mb-4">
                          Before signing, we need to verify your email address for security.
                        </p>

                        {!verificationSent ? (
                          <button
                            onClick={sendVerificationCode}
                            disabled={verificationLoading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {verificationLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                            Send Verification Code
                          </button>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-sm text-blue-700">
                              We sent a 6-digit code to <span className="font-medium">{maskedEmail}</span>.
                              Enter it below to continue.
                            </p>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                className="flex-1 px-4 py-3 text-center text-xl font-mono tracking-widest border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                onClick={verifyCode}
                                disabled={verificationLoading || verificationCode.length !== 6}
                                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {verificationLoading ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  "Verify"
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <p className="text-xs text-blue-600">
                                Code expires in {verificationExpiry} minutes
                              </p>
                              <button
                                onClick={resendVerificationCode}
                                disabled={verificationLoading}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Resend Code
                              </button>
                            </div>
                          </div>
                        )}

                        {verificationError && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{verificationError}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Verified Success */}
              {emailVerified && (
                <div className="px-8 py-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-900">Email Verified</p>
                      <p className="text-sm text-emerald-700">You can now proceed to sign the document.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      // Just view document without starting signing
                      setSigningStage("signing");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Review Document
                  </button>
                  <button
                    onClick={handleStartSigning}
                    disabled={!emailVerified}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#202e46] text-white font-medium rounded-xl hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {emailVerified ? "Start Signing" : "Verify Email First"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SIGNING STAGE ==================== */}
        {signingStage === "signing" && (
          <>
        {/* Personal Message */}
        {signatureRequest.message && (
          <div className="bg-[#202e46]/5 border border-[#202e46]/20 rounded-xl p-6 mb-6">
            <p className="text-[#202e46]">{signatureRequest.message}</p>
          </div>
        )}

        {/* Sequential Signing Progress */}
        {signingProgress && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Signing Order ({signingProgress.signers.filter(s => s.status === "signed").length} of {signingProgress.totalSigners} signed)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {signingProgress.signers.map((signer, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${signer.status === "signed"
                      ? "bg-emerald-100 text-emerald-700"
                      : signer.isCurrent
                        ? "bg-[#529ec6]/10 text-[#202e46] ring-2 ring-[#529ec6]/30"
                        : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {signer.status === "signed" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold">
                        {signer.order}
                      </span>
                    )}
                    <span className="font-medium">{signer.name.split(" ")[0]}</span>
                  </div>
                  {index < signingProgress.signers.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Contract Document */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Title */}
              <div className="px-8 py-6 border-b border-slate-100 text-center">
                <h1 className="text-2xl font-bold text-slate-900">
                  {contract.title}
                </h1>
              </div>

              {/* Sign-only mode: Show PDF with signature field overlays */}
              {contract.processingMode === "sign_only" && contract.sourceFileUrl ? (
                <div className="p-4">
                  <PDFSigningView
                    pdfUrl={contract.sourceFileUrl}
                    signatureFields={signatureFields}
                    currentSignerRole={signatureRequest?.signerRole || ""}
                    fieldValues={fieldValues}
                    onFieldClick={(field) => {
                      // Find this field in myFields and navigate to it
                      const fieldIndex = myFields.findIndex((f) => f.id === field.id);
                      if (fieldIndex !== -1) {
                        setCurrentFieldIndex(fieldIndex);
                      }
                      // Scroll to signing panel
                      document.getElementById("signing-panel")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                </div>
              ) : (
                <>
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
                      <div key={clause.id}>
                        <button
                          onClick={() => toggleClause(clause.id)}
                          className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50"
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
                          </div>
                        </button>

                        {expandedClauses.has(clause.id) && (
                          <div className="px-8 pb-6">
                            <div className="pl-8">
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {clause.content}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Signature Block - Document Style (hidden for sign_only since fields are on PDF) */}
              {contract.processingMode !== "sign_only" && (
              <div className="px-8 py-6 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-6">
                  Signatures
                </h3>

                {/* If there are signature fields, show them in document style */}
                {signatureFields.length > 0 ? (
                  <div className="space-y-8">
                    {/* Group fields by signer role */}
                    {(() => {
                      const roles = [...new Set(signatureFields.map((f) => f.signer_role))];
                      return roles.map((role) => {
                        const roleFields = signatureFields.filter((f) => f.signer_role === role);
                        const signatureField = roleFields.find((f) => f.type === "signature");
                        const dateField = roleFields.find((f) => f.type === "date");
                        const initialsField = roleFields.find((f) => f.type === "initials");
                        const textFields = roleFields.filter((f) => f.type === "text");
                        const checkboxFields = roleFields.filter((f) => f.type === "checkbox");
                        const dropdownFields = roleFields.filter((f) => f.type === "dropdown");
                        const attachmentFields = roleFields.filter((f) => f.type === "attachment");

                        const signatureValue = signatureField ? fieldValues.get(signatureField.id) : null;
                        const dateValue = dateField ? fieldValues.get(dateField.id) : null;
                        const initialsValue = initialsField ? fieldValues.get(initialsField.id) : null;

                        const isMyRole = signatureRequest?.signerRole === role;

                        return (
                          <div key={role} className="pb-6 border-b border-slate-200 last:border-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-4">{role}</p>

                            <div className="flex flex-wrap gap-8">
                              {/* Signature */}
                              {signatureField && (
                                <div className="flex-1 min-w-[200px]">
                                  {signatureValue?.signatureData ? (
                                    <div>
                                      <img
                                        src={signatureValue.signatureData}
                                        alt="Signature"
                                        className="h-12 object-contain mb-1"
                                      />
                                      <div className="border-t border-slate-400 pt-1">
                                        <p className="text-xs text-slate-500">{signatureField.label || "Signature"}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (isMyRole) {
                                          setShowAdoptModal(true);
                                        }
                                      }}
                                      disabled={!isMyRole}
                                      className={`w-full pb-1 border-b-2 ${isMyRole
                                        ? "border-amber-400 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                                        : "border-slate-300 bg-slate-50"
                                        }`}
                                    >
                                      <div className="h-10 flex items-center justify-center">
                                        {isMyRole ? (
                                          <span className="text-sm text-amber-600 font-medium">Click to sign</span>
                                        ) : (
                                          <span className="text-sm text-slate-400">Awaiting signature</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{signatureField.label || "Signature"}</p>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Date */}
                              {dateField && (
                                <div className="w-40">
                                  {dateValue?.value ? (
                                    <div>
                                      <p className="text-sm font-medium text-slate-900 h-12 flex items-end pb-1">
                                        {dateValue.value}
                                      </p>
                                      <div className="border-t border-slate-400 pt-1">
                                        <p className="text-xs text-slate-500">{dateField.label || "Date"}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`pb-1 border-b-2 ${isMyRole ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-slate-50"}`}>
                                      <div className="h-10 flex items-center justify-center">
                                        <span className="text-sm text-slate-400">-</span>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{dateField.label || "Date"}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Initials */}
                              {initialsField && (
                                <div className="w-24">
                                  {initialsValue?.signatureData ? (
                                    <div>
                                      <img
                                        src={initialsValue.signatureData}
                                        alt="Initials"
                                        className="h-10 object-contain mb-1"
                                      />
                                      <div className="border-t border-slate-400 pt-1">
                                        <p className="text-xs text-slate-500">{initialsField.label || "Initials"}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`pb-1 border-b-2 ${isMyRole ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-slate-50"}`}>
                                      <div className="h-10 flex items-center justify-center">
                                        <span className="text-sm text-slate-400">-</span>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{initialsField.label || "Initials"}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Text Fields (e.g., Printed Name) */}
                              {textFields.map((textField) => {
                                const textValue = fieldValues.get(textField.id);
                                return (
                                  <div key={textField.id} className="w-48">
                                    {textValue?.value ? (
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 h-10 flex items-end pb-1">
                                          {textValue.value}
                                        </p>
                                        <div className="border-t border-slate-400 pt-1">
                                          <p className="text-xs text-slate-500">{textField.label || "Text"}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`pb-1 border-b-2 ${isMyRole ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-slate-50"}`}>
                                        <div className="h-10 flex items-center justify-center">
                                          <span className="text-sm text-slate-400">-</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{textField.label || "Text"}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Checkbox Fields */}
                              {checkboxFields.map((checkboxField) => {
                                const checkValue = fieldValues.get(checkboxField.id);
                                const isChecked = checkValue?.value === "true";
                                return (
                                  <div key={checkboxField.id} className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        if (isMyRole) {
                                          const newValue = new Map(fieldValues);
                                          newValue.set(checkboxField.id, {
                                            fieldId: checkboxField.id,
                                            value: isChecked ? "false" : "true",
                                          });
                                          setFieldValues(newValue);
                                        }
                                      }}
                                      disabled={!isMyRole}
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isChecked
                                        ? "bg-[#202e46] border-[#529ec6] text-white"
                                        : isMyRole
                                          ? "border-amber-400 bg-amber-50 hover:bg-amber-100"
                                          : "border-slate-300 bg-slate-50"
                                        }`}
                                    >
                                      {isChecked && <Check className="w-3 h-3" />}
                                    </button>
                                    <span className="text-sm text-slate-700">{checkboxField.label}</span>
                                  </div>
                                );
                              })}

                              {/* Dropdown Fields */}
                              {dropdownFields.map((dropdownField) => {
                                const dropValue = fieldValues.get(dropdownField.id);
                                return (
                                  <div key={dropdownField.id} className="w-48">
                                    {dropValue?.value ? (
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 h-10 flex items-end pb-1">
                                          {dropValue.value}
                                        </p>
                                        <div className="border-t border-slate-400 pt-1">
                                          <p className="text-xs text-slate-500">{dropdownField.label || "Selection"}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`relative ${isMyRole ? "" : "pointer-events-none opacity-60"}`}>
                                        <select
                                          onChange={(e) => {
                                            if (isMyRole && e.target.value) {
                                              const newValue = new Map(fieldValues);
                                              newValue.set(dropdownField.id, {
                                                fieldId: dropdownField.id,
                                                value: e.target.value,
                                              });
                                              setFieldValues(newValue);
                                            }
                                          }}
                                          className={`w-full h-10 px-3 border-b-2 bg-transparent appearance-none text-sm ${isMyRole ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-slate-50"
                                            }`}
                                          defaultValue=""
                                        >
                                          <option value="" disabled>Select...</option>
                                          {dropdownField.options?.choices?.map((choice) => (
                                            <option key={choice} value={choice}>{choice}</option>
                                          ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <p className="text-xs text-slate-500 mt-1">{dropdownField.label || "Selection"}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Attachment Fields */}
                              {attachmentFields.map((attachmentField) => {
                                const attachValue = fieldValues.get(attachmentField.id);
                                return (
                                  <div key={attachmentField.id} className="w-48">
                                    {attachValue?.attachmentData ? (
                                      <div>
                                        <div className="flex items-center gap-2 h-10">
                                          <Paperclip className="w-4 h-4 text-slate-500" />
                                          <span className="text-sm font-medium text-slate-900 truncate">
                                            {attachValue.attachmentData.fileName}
                                          </span>
                                        </div>
                                        <div className="border-t border-slate-400 pt-1">
                                          <p className="text-xs text-slate-500">{attachmentField.label || "Attachment"}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={isMyRole ? "" : "pointer-events-none opacity-60"}>
                                        <label className={`flex items-center justify-center gap-2 h-10 border-b-2 cursor-pointer ${isMyRole ? "border-amber-400 bg-amber-50 hover:bg-amber-100" : "border-slate-300 bg-slate-50"
                                          }`}>
                                          <Paperclip className="w-4 h-4 text-amber-600" />
                                          <span className="text-sm text-amber-600">Upload file</span>
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file && isMyRole) {
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                  const newValue = new Map(fieldValues);
                                                  newValue.set(attachmentField.id, {
                                                    fieldId: attachmentField.id,
                                                    attachmentData: {
                                                      fileName: file.name,
                                                      fileSize: file.size,
                                                      fileType: file.type,
                                                      dataUrl: reader.result as string,
                                                    },
                                                  });
                                                  setFieldValues(newValue);
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            }}
                                          />
                                        </label>
                                        <p className="text-xs text-slate-500 mt-1">{attachmentField.label || "Attachment"}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  // Original signature block text
                  <div className="whitespace-pre-wrap text-slate-700 font-mono text-sm">
                    {contract.content.signatureBlock}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          {/* Signing Panel */}
          <div id="signing-panel" className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Sign Document
              </h2>

              {/* Signer Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-500">Signing as</p>
                <p className="font-medium text-slate-900">
                  {signatureRequest.signerName}
                </p>
                <p className="text-sm text-slate-500">
                  {signatureRequest.signerEmail}
                </p>
                {signatureRequest.signerRole && (
                  <p className="text-sm text-[#529ec6] mt-1">
                    {signatureRequest.signerRole}
                  </p>
                )}
              </div>

              {/* Payment Section */}
              {paymentRequired && (
                <div className="mb-6">
                  <div className={`rounded-lg p-4 ${paymentCompleted ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {paymentCompleted ? (
                        <Check className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-amber-600" />
                      )}
                      <span className={`font-medium ${paymentCompleted ? "text-emerald-900" : "text-amber-900"}`}>
                        {paymentCompleted ? "Payment Complete" : "Payment Required"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {paymentCompleted
                        ? "Your payment has been processed successfully."
                        : `A payment of ${new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: contract?.paymentCurrency || "usd",
                        }).format(contract?.paymentAmount || 0)} will be collected after you sign.`}
                    </p>
                    {paymentError && (
                      <p className="text-sm text-red-600 mt-2">{paymentError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Field Progress & Adopt Signature CTA */}
              {myFields.length > 0 && (
                <div className="mb-6">
                  {/* Progress bar */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Fields to Complete
                    </span>
                    <span className="text-sm text-slate-500">
                      {fieldValues.size}/{myFields.length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(fieldValues.size / myFields.length) * 100}%` }}
                    />
                  </div>

                  {/* Adopt Signature Button - shows when not all fields are filled */}
                  {!allRequiredFieldsCompleted() && (
                    <button
                      onClick={() => setShowAdoptModal(true)}
                      className="w-full py-4 px-6 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                    >
                      <PenTool className="w-5 h-5" />
                      {adoptedSignature ? "Change Signature" : "Adopt Your Signature"}
                    </button>
                  )}

                  {/* Show adopted signature preview */}
                  {adoptedSignature && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-900">Signature Adopted</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={adoptedSignature}
                          alt="Your signature"
                          className="h-8 object-contain"
                        />
                        {adoptedInitials && (
                          <>
                            <span className="text-slate-300">|</span>
                            <img
                              src={adoptedInitials}
                              alt="Your initials"
                              className="h-6 object-contain"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All fields completed message */}
                  {allRequiredFieldsCompleted() && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-900">
                          All fields completed! Click "Sign Document" below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Read Confirmation */}
              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReadContract}
                  onChange={(e) => setHasReadContract(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#529ec6] border-slate-300 rounded focus:ring-[#529ec6]"
                />
                <span className="text-sm text-slate-700">
                  I have read and understand this document
                </span>
              </label>

              {/* Date Field Completion */}
              {currentField?.type === "date" && !isFieldCompleted(currentField.id) && (
                <div className="mb-4">
                  <button
                    onClick={completeCurrentField}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Add Today's Date
                  </button>
                </div>
              )}

              {/* Signature Mode Tabs (shown for signature/initials fields or when no fields) */}
              {(!currentField || currentField.type === "signature" || currentField.type === "initials" || myFields.length === 0) && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    {currentField ? `${currentField.label || currentField.type}` : "Your Signature"}
                  </label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden mb-3">
                    <button
                      onClick={() => setSignatureMode("draw")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${signatureMode === "draw"
                        ? "bg-[#202e46] text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      <PenTool className="w-4 h-4" />
                      Draw
                    </button>
                    <button
                      onClick={() => setSignatureMode("style")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-x border-slate-200 ${signatureMode === "style"
                        ? "bg-[#202e46] text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Style
                    </button>
                    <button
                      onClick={() => setSignatureMode("upload")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${signatureMode === "upload"
                        ? "bg-[#202e46] text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </div>

                  {/* Draw Mode */}
                  {signatureMode === "draw" && (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <button
                          onClick={clearSignature}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                        >
                          <Eraser className="w-3 h-3" />
                          Clear
                        </button>
                      </div>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg overflow-hidden bg-white touch-none">
                        <canvas
                          ref={canvasRef}
                          width={300}
                          height={150}
                          className="w-full cursor-crosshair touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawingTouch}
                          onTouchMove={drawTouch}
                          onTouchEnd={stopDrawingTouch}
                        />
                      </div>
                      {!hasSignature && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <PenTool className="w-3 h-3" />
                          Draw your signature above
                        </p>
                      )}
                    </div>
                  )}

                  {/* Style Mode */}
                  {signatureMode === "style" && (
                    <div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Type your full name"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent text-lg mb-3"
                      />
                      {fullName.trim().length >= 2 && (
                        <div className="grid grid-cols-1 gap-2">
                          {SIGNATURE_FONTS.slice(0, 3).map((font, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedFontIndex(index)}
                              className={`p-3 border-2 rounded-lg text-left transition-all ${selectedFontIndex === index
                                ? "border-[#529ec6] bg-[#529ec6]/5"
                                : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                              <p
                                className="text-xl text-slate-800"
                                style={{ fontFamily: font.font, fontWeight: font.weight }}
                              >
                                {fullName}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Select a signature style above
                      </p>
                    </div>
                  )}

                  {/* Upload Mode */}
                  {signatureMode === "upload" && (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {!uploadedSignature ? (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-6 border-2 border-dashed border-slate-200 rounded-lg bg-white hover:border-[#529ec6]/30 hover:bg-[#529ec6]/5 transition-colors"
                        >
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600">Click to upload signature image</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
                        </button>
                      ) : (
                        <div className="relative">
                          <div className="border-2 border-dashed border-slate-200 rounded-lg overflow-hidden bg-white p-2">
                            <img
                              src={uploadedSignature}
                              alt="Uploaded signature"
                              className="max-h-32 mx-auto object-contain"
                            />
                          </div>
                          <button
                            onClick={() => {
                              setUploadedSignature(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-slate-50"
                            aria-label="Remove uploaded signature"
                          >
                            <Eraser className="w-4 h-4 text-slate-500" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Apply to Field Button */}
                  {currentField && (currentField.type === "signature" || currentField.type === "initials") && !isFieldCompleted(currentField.id) && hasValidSignature() && (
                    <button
                      onClick={completeCurrentField}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Apply {currentField.type === "initials" ? "Initials" : "Signature"} to Field
                    </button>
                  )}
                </div>
              )}

              {/* Confirmation Checkboxes */}
              <div className="space-y-3 mb-4">
                {/* Identity Confirmation */}
                <label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(e) => setIdentityConfirmed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-[#202e46] border-slate-300 rounded focus:ring-[#202e46]"
                  />
                  <span className="text-sm text-slate-700">
                    {identityConfirmationText || `I confirm that I am ${signatureRequest.signerName} and I am authorized to sign this document.`}
                  </span>
                </label>

                {/* Legal Agreement */}
                <label className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-[#202e46] border-slate-300 rounded focus:ring-[#202e46]"
                  />
                  <span className="text-sm text-slate-700">
                    I agree that my electronic signature is legally binding and has
                    the same effect as a handwritten signature.
                  </span>
                </label>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-3 text-sm text-slate-500 mb-4">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>By clicking &quot;Sign Document&quot;, you are entering into a legally binding agreement.</p>
              </div>

              {/* Sign Document Button */}
              <button
                onClick={handleSign}
                disabled={
                  signing ||
                  !hasReadContract ||
                  !agreedToTerms ||
                  !identityConfirmed ||
                  (myFields.length > 0 ? !allRequiredFieldsCompleted() : !hasValidSignature())
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </>
                ) : myFields.length > 0 && !allRequiredFieldsCompleted() ? (
                  <>
                    <PenTool className="w-4 h-4" />
                    Complete All Fields ({fieldValues.size}/{myFields.filter(f => f.required).length})
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Sign Document
                  </>
                )}
              </button>

              {/* Expiration Notice */}
              <p className="text-xs text-slate-400 text-center mt-4">
                This signing link expires on{" "}
                {new Date(signatureRequest.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            Powered by <span className="font-semibold text-slate-700">Lexport</span>
            {" • "}
            Secure e-signatures compliant with ESIGN, UETA, and UK eIDAS
          </p>
        </div>
      </footer>

      {/* "Adopt Your Signature" Modal */}
      {showAdoptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Adopt Your Signature</h2>
              <button
                onClick={() => setShowAdoptModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close signature modal"
              >
                <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                <span className="font-medium">Step 1 of 2:</span> Create your signature below. After adopting, you&apos;ll review the contract and confirm to sign.
              </p>

              {/* Full Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
                />
              </div>

              {/* Signature Mode Tabs */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden mb-6">
                <button
                  onClick={() => setSignatureMode("style")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${signatureMode === "style"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Select Style
                </button>
                <button
                  onClick={() => setSignatureMode("draw")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-x border-slate-200 ${signatureMode === "draw"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <PenTool className="w-4 h-4" />
                  Draw
                </button>
                <button
                  onClick={() => setSignatureMode("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${signatureMode === "upload"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>

              {/* Style Selection Mode */}
              {signatureMode === "style" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 mb-3">Choose a signature style:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {SIGNATURE_FONTS.map((font, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFontIndex(index)}
                        className={`p-4 border-2 rounded-xl text-left transition-all ${selectedFontIndex === index
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">{font.name}</p>
                            <p
                              className="text-2xl text-slate-800"
                              style={{ fontFamily: font.font, fontWeight: font.weight }}
                            >
                              {fullName || "Your Name"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400">Initials</p>
                              <p
                                className="text-lg text-slate-800"
                                style={{ fontFamily: font.font, fontWeight: font.weight }}
                              >
                                {generateInitials(fullName) || "YN"}
                              </p>
                            </div>
                            {selectedFontIndex === index && (
                              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Draw Mode */}
              {signatureMode === "draw" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500">Draw your signature below:</p>
                    <button
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <Eraser className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white touch-none">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawingTouch}
                      onTouchMove={drawTouch}
                      onTouchEnd={stopDrawingTouch}
                    />
                  </div>
                  {!hasSignature && (
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <PenTool className="w-3 h-3" />
                      Use your mouse or finger to draw your signature
                    </p>
                  )}
                </div>
              )}

              {/* Upload Mode */}
              {signatureMode === "upload" && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {!uploadedSignature ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-8 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:border-amber-400 hover:bg-amber-50 transition-colors"
                    >
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 font-medium">Click to upload signature image</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
                    </button>
                  ) : (
                    <div className="relative">
                      <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white p-4">
                        <img
                          src={uploadedSignature}
                          alt="Uploaded signature"
                          className="max-h-32 mx-auto object-contain"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setUploadedSignature(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md border border-slate-200 hover:bg-slate-50"
                        aria-label="Remove uploaded signature"
                      >
                        <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Section */}
              {fullName.trim().length >= 2 && signatureMode === "style" && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-3 uppercase font-medium">Preview</p>
                  <div className="flex items-center gap-6">
                    <div className="flex-1 p-4 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Signed by:</p>
                      <p
                        className="text-2xl text-blue-900"
                        style={{ fontFamily: SIGNATURE_FONTS[selectedFontIndex].font }}
                      >
                        {fullName}
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Initials:</p>
                      <p
                        className="text-xl text-blue-900"
                        style={{ fontFamily: SIGNATURE_FONTS[selectedFontIndex].font }}
                      >
                        {generateInitials(fullName)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Agreement */}
              <p className="text-xs text-slate-500 mt-6 leading-relaxed">
                By adopting this signature, I agree that it will be the electronic representation of my
                signature and initials for all purposes when I (or my agent) use them on documents.
                You will review the contract before signing.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowAdoptModal(false)}
                className="px-6 py-2.5 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdoptAndSign}
                disabled={!hasValidSignature()}
                className="px-6 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Adopt Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
