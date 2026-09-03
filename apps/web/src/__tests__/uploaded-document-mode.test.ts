import { describe, expect, it } from "vitest";
import {
  isAiReviewMode,
  preservesUploadedOriginal,
  supportsOriginalSigning,
} from "@/lib/contracts/uploaded-document";

describe("uploaded document modes", () => {
  it("keeps both signing and AI review anchored to the original pages", () => {
    expect(preservesUploadedOriginal("sign_only")).toBe(true);
    expect(preservesUploadedOriginal("review")).toBe(true);
  });

  it("does not treat legacy reconstructed drafts as original documents", () => {
    expect(preservesUploadedOriginal("edit_and_sign")).toBe(false);
    expect(preservesUploadedOriginal("full")).toBe(false);
    expect(preservesUploadedOriginal(null)).toBe(false);
  });

  it("identifies the non-destructive AI review workspace", () => {
    expect(isAiReviewMode("review")).toBe(true);
    expect(isAiReviewMode("sign_only")).toBe(false);
  });

  it("requires a fixed-layout source before placing legal fields", () => {
    expect(supportsOriginalSigning("pdf")).toBe(true);
    expect(supportsOriginalSigning("jpg")).toBe(true);
    expect(supportsOriginalSigning("png")).toBe(true);
    expect(supportsOriginalSigning("docx")).toBe(false);
  });
});
