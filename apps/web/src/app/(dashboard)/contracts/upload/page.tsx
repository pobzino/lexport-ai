"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { ModeSelector, type ProcessingMode } from "@/components/upload/mode-selector";
import {
  ProcessingStatus,
  type ProcessingStep,
} from "@/components/upload/processing-status";
import { ContentPreview } from "@/components/upload/content-preview";
import { OriginalDocumentPreview } from "@/components/upload/original-document-preview";
import { createClient } from "@/lib/supabase/client";
import {
  getUploadFileType,
  getUploadMimeType,
  type UploadFileType,
} from "@/lib/upload/file-validation";
import type { ContractContent } from "@/db/types";

type UploadStep = "prepare" | "processing" | "review";
type ExtractionStatus = "idle" | "ready" | "skipped";

interface UploadState {
  file: File | null;
  filePath: string | null;
  fileType: UploadFileType | null;
  extractedText: string | null;
  parsedContent: ContractContent | null;
  extractionStatus: ExtractionStatus;
  extractionNotice: string | null;
  wordCount: number;
  pageCount: number | null;
  confidence: "high" | "medium" | "low" | null;
  title: string;
  type: string;
  jurisdiction: string;
  processingMode: ProcessingMode;
}

const CONTRACT_TYPES = [
  { value: "nda_mutual", label: "Mutual NDA" },
  { value: "nda_oneway", label: "One-Way NDA" },
  { value: "contractor_agreement", label: "Contractor Agreement" },
  { value: "consulting_agreement", label: "Consulting Agreement" },
  { value: "service_agreement", label: "Service Agreement" },
  { value: "sow", label: "Statement of Work" },
  { value: "safe_note", label: "SAFE Note" },
  { value: "ip_assignment", label: "IP Assignment" },
  { value: "advisor_agreement", label: "Advisor Agreement" },
  { value: "employment_offer", label: "Employment Offer" },
  { value: "other", label: "Other" },
];

const JURISDICTIONS = [
  { value: "CA", label: "California, USA" },
  { value: "TX", label: "Texas, USA" },
  { value: "NY", label: "New York, USA" },
  { value: "UK", label: "United Kingdom" },
  { value: "other", label: "Other / not specified" },
];

const INITIAL_STATE: UploadState = {
  file: null,
  filePath: null,
  fileType: null,
  extractedText: null,
  parsedContent: null,
  extractionStatus: "idle",
  extractionNotice: null,
  wordCount: 0,
  pageCount: null,
  confidence: null,
  title: "",
  type: "service_agreement",
  jurisdiction: "other",
  processingMode: "sign_only",
};

function getFileTitle(file: File): string {
  return file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readJsonResponse(response: Response): Promise<Record<string, any>> {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      response.status === 504
        ? "Document processing timed out. Retry, or keep the original for signing."
        : "The server returned an invalid response. Please retry."
    );
  }
}

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "Document processing failed");
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Document processing took too long. Please retry.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function UploadContractPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("prepare");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("uploading");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    "uploading",
    "extracting",
  ]);
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const discardUpload = useCallback(async (filePath: string) => {
    try {
      await fetch("/api/contracts/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
    } catch {
      // Orphan cleanup is best effort and must not block the user.
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (state.filePath) void discardUpload(state.filePath);
      const fileType = file ? getUploadFileType(file.name, file.type) : null;
      setError(null);
      setState((previous) => ({
        ...INITIAL_STATE,
        processingMode:
          fileType === "docx" ? "review" : previous.processingMode,
        file,
        fileType,
        title: file ? getFileTitle(file) : "",
      }));
    },
    [discardUpload, state.filePath]
  );

  const handleModeSelect = (processingMode: ProcessingMode) => {
    setError(null);
    setState((previous) => ({
      ...previous,
      processingMode,
      parsedContent: null,
      confidence: null,
    }));
  };

  const uploadDirectly = async (): Promise<{
    filePath: string;
    fileType: UploadFileType;
  }> => {
    if (!state.file) throw new Error("Choose a contract file first");

    const uploadRequest = await requestJson(
      "/api/contracts/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: state.file.name,
          fileSize: state.file.size,
          mimeType: state.file.type,
        }),
      },
      15_000
    );

    const filePath = uploadRequest.filePath as string;
    const fileType = uploadRequest.fileType as UploadFileType;
    const token = uploadRequest.token as string;
    const { error: uploadError } = await createClient()
      .storage
      .from("contract-uploads")
      .uploadToSignedUrl(filePath, token, state.file, {
        cacheControl: "3600",
        contentType: state.file.type || getUploadMimeType(fileType),
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    setState((previous) => ({ ...previous, filePath, fileType }));
    return { filePath, fileType };
  };

  const extractDocument = async (
    filePath: string,
    fileType: UploadFileType,
    requiredForReview: boolean
  ): Promise<string | null> => {
    setProcessingStep("extracting");

    try {
      const extraction = await requestJson(
        "/api/contracts/upload/extract",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath, fileType }),
        },
        requiredForReview ? 28_000 : 12_000
      );

      let text = typeof extraction.text === "string" ? extraction.text : "";
      let confidence = null as UploadState["confidence"];

      if (extraction.needsOCR) {
        if (!requiredForReview) {
          setState((previous) => ({
            ...previous,
            extractionStatus: "skipped",
            extractionNotice:
              "This looks like a scan. The original is ready for signing; choose Review with AI if you also need OCR analysis.",
            pageCount: extraction.pageCount || null,
          }));
          return null;
        }

        setProcessingSteps(["uploading", "extracting", "ocr", "parsing"]);
        setProcessingStep("ocr");
        const ocr = await requestJson(
          "/api/contracts/upload/ocr",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath, fileType }),
          },
          28_000
        );
        text = typeof ocr.text === "string" ? ocr.text : "";
        confidence = ocr.confidence || null;
      }

      if (text.trim().length < 50) {
        if (requiredForReview) {
          throw new Error(
            "We could not recover enough text for a reliable AI review. Keep the original for signing instead."
          );
        }

        setState((previous) => ({
          ...previous,
          extractionStatus: "skipped",
          extractionNotice:
            "The original is ready for signing, but there was not enough readable text for analysis.",
        }));
        return null;
      }

      const wordCount = text.trim().split(/\s+/).length;
      setState((previous) => ({
        ...previous,
        extractedText: text,
        extractionStatus: "ready",
        extractionNotice: null,
        wordCount,
        pageCount: extraction.pageCount || previous.pageCount,
        confidence: confidence || previous.confidence,
      }));
      return text;
    } catch (extractionError) {
      if (requiredForReview) throw extractionError;

      setState((previous) => ({
        ...previous,
        extractionStatus: "skipped",
        extractionNotice:
          "The original is ready for signing. Text analysis can be retried later.",
      }));
      return null;
    }
  };

  const parseForReview = async (text: string) => {
    setProcessingStep("parsing");
    const parsed = await requestJson(
      "/api/contracts/upload/parse",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      },
      28_000
    );

    setState((previous) => ({
      ...previous,
      parsedContent: parsed.content as ContractContent,
      title: parsed.suggestedTitle || previous.title,
      type: parsed.suggestedType || previous.type,
      jurisdiction: parsed.suggestedJurisdiction || previous.jurisdiction,
      confidence: parsed.confidence || previous.confidence,
    }));
  };

  const handleImport = async () => {
    if (!state.file || isProcessing) return;

    const isAiReview = state.processingMode === "review";
    setError(null);
    setIsProcessing(true);
    setStep("processing");
    setProcessingStep(state.filePath ? "extracting" : "uploading");
    setProcessingSteps(
      isAiReview
        ? ["uploading", "extracting", "parsing"]
        : ["uploading", "extracting"]
    );

    try {
      const upload = state.filePath && state.fileType
        ? { filePath: state.filePath, fileType: state.fileType }
        : await uploadDirectly();
      const text = await extractDocument(
        upload.filePath,
        upload.fileType,
        isAiReview
      );

      if (isAiReview) {
        if (!text) throw new Error("No text was available for AI review");
        await parseForReview(text);
      }

      setStep("review");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
      setStep("prepare");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateContract = async () => {
    if (!state.filePath || !state.fileType || isProcessing) return;

    setError(null);
    setIsProcessing(true);
    setStep("processing");
    setProcessingStep("creating");
    setProcessingSteps(["creating", "complete"]);

    try {
      const created = await requestJson(
        "/api/contracts/upload/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: state.title.trim(),
            type: state.type,
            jurisdiction: state.jurisdiction,
            processingMode: state.processingMode,
            extractedText: state.extractedText,
            sourceFileUrl: state.filePath,
            sourceFileType: state.fileType,
            content: state.parsedContent,
          }),
        },
        20_000
      );

      setProcessingStep("complete");
      const destination = state.processingMode === "sign_only"
        ? `/contracts/${created.contract.id}/edit?prepare=signatures`
        : `/contracts/${created.contract.id}/edit?workspace=review`;
      router.push(destination);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create contract"
      );
      setStep("review");
      setIsProcessing(false);
    }
  };

  const handleStartOver = async () => {
    if (state.filePath) await discardUpload(state.filePath);
    setState(INITIAL_STATE);
    setError(null);
    setStep("prepare");
  };

  const reviewMode = state.processingMode === "sign_only"
    ? "Ready to prepare"
    : "AI review workspace";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(82,158,198,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/contracts")}
            aria-label="Back to contracts"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#397fa4]">
              Import
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950">
              Bring an existing contract into Lexport
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {["Add file", "Review", "Open workspace"].map((label, index) => {
            const activeIndex = step === "review"
              ? 1
              : step === "processing" && processingStep === "creating"
                ? 2
                : 0;
            const complete = index < activeIndex;
            const active = index === activeIndex;
            return (
              <div
                key={label}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-slate-900 text-white"
                    : complete
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-400"
                }`}
              >
                {complete ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === "prepare" && (
            <motion.div
              key="prepare"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="mb-6 max-w-2xl">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Add the contract once
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Choose the file and what you want to do with it. The original remains the authoritative document either way.
                  </p>
                </div>

                <FileDropzone
                  onFileSelect={handleFileSelect}
                  isUploading={isProcessing}
                  error={error || undefined}
                />

                <div className="my-8 h-px bg-slate-100" />

                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-slate-950">What happens next?</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    You can change this choice before creating the contract.
                  </p>
                </div>
                <ModeSelector
                  selectedMode={state.processingMode}
                  onModeSelect={handleModeSelect}
                  disabled={isProcessing}
                  signOnlySupported={state.fileType !== "docx"}
                />

                <div className="mt-7 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <LockKeyhole className="h-4 w-4 text-emerald-600" />
                    Direct, private upload with short-lived access scoped to your account.
                  </div>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!state.file || isProcessing}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-[#397fa4] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {state.filePath ? "Retry import" : "Import contract"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [ShieldCheck, "Private by default", "Short-lived upload access and owner-scoped files."],
                  [FileText, "Original retained", "The source document remains attached to the contract."],
                  [Sparkles, "Non-destructive review", "AI builds a separate outline while the original stays unchanged."],
                ].map(([Icon, title, description]) => {
                  const FeatureIcon = Icon as typeof ShieldCheck;
                  return (
                    <div key={title as string} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
                      <FeatureIcon className="h-5 w-5 text-[#397fa4]" />
                      <p className="mt-3 text-sm font-semibold text-slate-900">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{description as string}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.section
              key="processing"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-slate-200 bg-white px-6 py-16 shadow-sm"
            >
              <ProcessingStatus
                currentStep={processingStep}
                ocrRequired={processingSteps.includes("ocr")}
                steps={processingSteps}
              />
              <p className="mx-auto mt-8 max-w-md text-center text-xs leading-5 text-slate-400">
                We preserve the source file throughout this process. Analysis never overwrites the original.
              </p>
            </motion.section>
          )}

          {step === "review" && state.file && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-5 border-b border-slate-100 bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{state.file.name}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {formatFileSize(state.file.size)}
                        {state.pageCount ? ` | ${state.pageCount} pages` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="w-fit rounded-full bg-[#529ec6]/20 px-3 py-1.5 text-xs font-semibold text-[#9bd4ef]">
                    {reviewMode}
                  </span>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-3">
                  <ReviewFact label="Source file" value="Stored privately" />
                  <ReviewFact
                    label="Readable text"
                    value={state.extractionStatus === "ready" ? `${state.wordCount.toLocaleString()} words` : "Not required"}
                  />
                  <ReviewFact
                    label="Next step"
                    value={state.processingMode === "sign_only" ? "Assign recipients and place fields" : "Open AI review alongside the original"}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#397fa4]">
                      Source document
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      Confirm every page before continuing
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-slate-500 sm:text-right">
                    This is the exact file Lexport will retain. AI review never replaces these pages.
                  </p>
                </div>
                <OriginalDocumentPreview file={state.file} />
              </section>

              {state.extractionNotice && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                  <div>
                    <p className="font-semibold">Your original file is safe to use</p>
                    <p className="mt-1 text-amber-800">{state.extractionNotice}</p>
                  </div>
                </div>
              )}

              {state.processingMode === "review" && state.parsedContent && (
                <ContentPreview
                  content={state.parsedContent}
                  confidence={state.confidence || undefined}
                />
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-950">Confirm contract details</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    These labels organize the contract. They do not change the uploaded document.
                  </p>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Contract title</span>
                    <input
                      type="text"
                      maxLength={160}
                      value={state.title}
                      onChange={(event) => setState((previous) => ({ ...previous, title: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-[#529ec6] focus:ring-4 focus:ring-[#529ec6]/10"
                      placeholder="Contract title"
                    />
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Contract type</span>
                      <select
                        value={state.type}
                        onChange={(event) => setState((previous) => ({ ...previous, type: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#529ec6] focus:ring-4 focus:ring-[#529ec6]/10"
                      >
                        {CONTRACT_TYPES.map((contractType) => (
                          <option key={contractType.value} value={contractType.value}>{contractType.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Jurisdiction</span>
                      <select
                        value={state.jurisdiction}
                        onChange={(event) => setState((previous) => ({ ...previous, jurisdiction: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#529ec6] focus:ring-4 focus:ring-[#529ec6]/10"
                      >
                        {JURISDICTIONS.map((jurisdiction) => (
                          <option key={jurisdiction.value} value={jurisdiction.value}>{jurisdiction.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
                >
                  <RotateCcw className="h-4 w-4" />
                  Use another file
                </button>
                <button
                  type="button"
                  onClick={handleCreateContract}
                  disabled={!state.title.trim() || isProcessing}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-[#397fa4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {state.processingMode === "sign_only"
                    ? "Continue to recipient setup"
                    : "Open AI review workspace"}
                  <CheckCircle2 className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ReviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
