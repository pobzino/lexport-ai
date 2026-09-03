export type UploadedProcessingMode =
  | "sign_only"
  | "review"
  | "edit_and_sign";

/**
 * Modes that keep the uploaded PDF or image as the authoritative document.
 * Review mode stores an extracted clause outline for analysis, but signatures
 * are still applied to the original pages rather than a reconstructed copy.
 */
export function preservesUploadedOriginal(
  mode: string | null | undefined,
): mode is "sign_only" | "review" {
  return mode === "sign_only" || mode === "review";
}

export function isAiReviewMode(
  mode: string | null | undefined,
): mode is "review" {
  return mode === "review";
}

export function supportsOriginalSigning(
  fileType: string | null | undefined,
): fileType is "pdf" | "jpg" | "png" {
  return fileType === "pdf" || fileType === "jpg" || fileType === "png";
}
