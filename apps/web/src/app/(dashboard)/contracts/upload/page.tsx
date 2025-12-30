"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { ProcessingStatus, ProcessingStep } from "@/components/upload/processing-status";
import { ContentPreview } from "@/components/upload/content-preview";
import type { ContractContent } from "@/db/types";

type UploadStep = "upload" | "details" | "processing";

interface UploadState {
  file: File | null;
  filePath: string | null;
  fileType: "pdf" | "docx" | "jpg" | "png" | null;
  signedUrl: string | null;
  extractedText: string | null;
  parsedContent: ContractContent | null;
  needsOCR: boolean;
  wordCount: number;
  confidence: "high" | "medium" | "low" | null;
  title: string;
  type: string;
  jurisdiction: string;
}

const CONTRACT_TYPES = [
  { value: "nda_mutual", label: "Mutual NDA" },
  { value: "nda_oneway", label: "One-Way NDA" },
  { value: "contractor_agreement", label: "Contractor Agreement" },
  { value: "consulting_agreement", label: "Consulting Agreement" },
  { value: "service_agreement", label: "Service Agreement" },
  { value: "employment_offer", label: "Employment Offer" },
  { value: "other", label: "Other" },
];

const JURISDICTIONS = [
  { value: "CA", label: "California, USA" },
  { value: "TX", label: "Texas, USA" },
  { value: "NY", label: "New York, USA" },
  { value: "UK", label: "United Kingdom" },
  { value: "other", label: "Other" },
];

export default function UploadContractPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("upload");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("uploading");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [state, setState] = useState<UploadState>({
    file: null,
    filePath: null,
    fileType: null,
    signedUrl: null,
    extractedText: null,
    parsedContent: null,
    needsOCR: false,
    wordCount: 0,
    confidence: null,
    title: "",
    type: "service_agreement",
    jurisdiction: "CA",
  });

  // Step 1: Upload file
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setState((prev) => ({ ...prev, file }));
  }, []);

  const handleUploadFile = async () => {
    if (!state.file) return;

    setIsProcessing(true);
    setError(null);
    setStep("processing");
    setProcessingStep("uploading");

    try {
      const formData = new FormData();
      formData.append("file", state.file);

      const uploadRes = await fetch("/api/contracts/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const title = state.file?.name.replace(/\.[^/.]+$/, "") || "Uploaded Contract";

      setState((prev) => ({
        ...prev,
        filePath: uploadData.filePath,
        fileType: uploadData.fileType,
        signedUrl: uploadData.signedUrl,
        title,
      }));

      // Continue directly to extraction (full mode)
      await handleExtractAfterUpload(uploadData.filePath, uploadData.fileType, title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("upload");
      setIsProcessing(false);
    }
  };

  // Extract content after upload (always full mode)
  const handleExtractAfterUpload = async (filePath: string, fileType: string, title: string) => {
    setProcessingStep("extracting");

    try {
      // Extract text
      const extractRes = await fetch("/api/contracts/upload/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          fileType,
        }),
      });

      const extractData = await safeParseJson(extractRes, "extract");

      if (!extractRes.ok) {
        throw new Error(extractData.error || "Extraction failed");
      }

      let text = extractData.text;
      let needsOCR = extractData.needsOCR;

      // If OCR is needed, run it
      if (needsOCR) {
        setProcessingStep("ocr");

        const ocrRes = await fetch("/api/contracts/upload/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath,
            fileType,
          }),
        });

        const ocrData = await safeParseJson(ocrRes, "ocr");

        if (!ocrRes.ok) {
          throw new Error(ocrData.error || "OCR failed");
        }

        text = ocrData.text;
        setState((prev) => ({
          ...prev,
          confidence: ocrData.confidence,
        }));
      }

      setState((prev) => ({
        ...prev,
        extractedText: text,
        wordCount: text.split(/\s+/).length,
        needsOCR,
        title: extractData.suggestedTitle || title,
        type: extractData.suggestedType || prev.type,
        jurisdiction: extractData.suggestedJurisdiction || prev.jurisdiction,
        confidence: extractData.confidence || prev.confidence,
      }));

      // Always parse content (full mode)
      setProcessingStep("parsing");

      const parseRes = await fetch("/api/contracts/upload/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const parseData = await safeParseJson(parseRes, "parse");

      if (!parseRes.ok) {
        throw new Error(parseData.error || "Parsing failed");
      }

      setState((prev) => ({
        ...prev,
        parsedContent: parseData.content,
        title: parseData.suggestedTitle || prev.title,
        type: parseData.suggestedType || prev.type,
        jurisdiction: parseData.suggestedJurisdiction || prev.jurisdiction,
        confidence: parseData.confidence,
      }));

      setStep("details");
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStep("upload");
      setIsProcessing(false);
    }
  };

  // Helper to safely parse JSON responses
  const safeParseJson = async (response: Response, endpoint: string) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      // If response is HTML (like a 404 page), provide a clear error
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        throw new Error(`Server returned an error page for ${endpoint}. The endpoint may not exist or crashed.`);
      }
      throw new Error(`Invalid response from ${endpoint}: ${text.slice(0, 100)}`);
    }
  };

  // Step 2: Review details and create
  const handleCreateContract = async () => {
    if (!state.filePath) return;

    setIsProcessing(true);
    setStep("processing");
    setProcessingStep("creating");
    setError(null);

    try {
      const createRes = await fetch("/api/contracts/upload/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          type: state.type,
          jurisdiction: state.jurisdiction,
          processingMode: "full",
          extractedText: state.extractedText,
          sourceFileUrl: state.filePath, // Store file path, not signed URL (which expires)
          sourceFileType: state.fileType,
          content: state.parsedContent,
        }),
      });

      const createData = await safeParseJson(createRes, "create");

      if (!createRes.ok) {
        throw new Error(createData.error || "Failed to create contract");
      }

      setProcessingStep("complete");

      // Redirect to the contract editor
      setTimeout(() => {
        router.push(`/contracts/${createData.contract.id}/edit`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
      setStep("details");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/contracts")}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Upload Contract
              </h1>
              <p className="text-sm text-slate-500">
                Import an existing contract for signing and analysis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {[
              { key: "upload", label: "Upload", icon: Upload },
              { key: "details", label: "Review", icon: FileText },
              { key: "processing", label: "Complete", icon: CheckCircle },
            ].map((s, index) => {
              const Icon = s.icon;
              const isActive = s.key === step;
              const isComplete =
                ["upload", "details", "processing"].indexOf(step) > index;

              return (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 ${isActive
                      ? "text-[#529ec6]"
                      : isComplete
                        ? "text-emerald-600"
                        : "text-slate-400"
                      }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive
                        ? "bg-[#529ec6]/10"
                        : isComplete
                          ? "bg-emerald-100"
                          : "bg-slate-100"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">
                      {s.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-16 sm:w-32 h-0.5 mx-2 ${isComplete ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Choose your contract file
                </h2>
                <p className="text-slate-500">
                  Upload a PDF, Word document, or scanned image
                </p>
              </div>

              <FileDropzone
                onFileSelect={handleFileSelect}
                isUploading={isProcessing}
                error={error || undefined}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleUploadFile}
                  disabled={!state.file || isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-[#529ec6] text-white rounded-xl font-medium hover:bg-[#4189b1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12"
            >
              <ProcessingStatus
                currentStep={processingStep}
                mode="full"
                ocrRequired={state.needsOCR}
                error={error || undefined}
              />
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Review contract details
                </h2>
                <p className="text-slate-500">
                  Verify the extracted information before creating your contract
                </p>
              </div>

              {/* Preview */}
              <ContentPreview
                text={state.extractedText || undefined}
                content={state.parsedContent || undefined}
                mode="full"
                wordCount={state.wordCount}
                confidence={state.confidence || undefined}
              />

              {/* Contract details form */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contract Title
                  </label>
                  <input
                    type="text"
                    value={state.title}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-[#529ec6] outline-none transition-colors"
                    placeholder="Enter contract title"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contract Type
                    </label>
                    <select
                      value={state.type}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, type: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-[#529ec6] outline-none transition-colors"
                    >
                      {CONTRACT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Jurisdiction
                    </label>
                    <select
                      value={state.jurisdiction}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          jurisdiction: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-[#529ec6] outline-none transition-colors"
                    >
                      {JURISDICTIONS.map((j) => (
                        <option key={j.value} value={j.value}>
                          {j.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep("upload")}
                  className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={handleCreateContract}
                  disabled={!state.title || isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-[#529ec6] text-white rounded-xl font-medium hover:bg-[#4189b1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Contract
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
