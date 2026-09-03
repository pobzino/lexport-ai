import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_FILE_SIZE,
  getUploadFileType,
  isOwnedUploadPath,
  sanitizeUploadFileName,
  validateUploadedFileBytes,
  validateUploadFileMetadata,
} from "@/lib/upload/file-validation";

describe("contract upload file validation", () => {
  it("accepts supported files and cloud-drive files without a MIME type", () => {
    expect(getUploadFileType("agreement.pdf", "application/pdf")).toBe("pdf");
    expect(getUploadFileType("agreement.docx", "")).toBe("docx");
    expect(getUploadFileType("scan.jpeg", "application/octet-stream")).toBe("jpg");
  });

  it("rejects extension and MIME type mismatches", () => {
    expect(getUploadFileType("agreement.pdf", "image/png")).toBeNull();
    expect(getUploadFileType("payload.exe", "application/pdf")).toBeNull();
  });

  it("rejects empty and oversized files", () => {
    expect(validateUploadFileMetadata({
      fileName: "agreement.pdf",
      fileSize: 0,
      mimeType: "application/pdf",
    })).toContain("empty");

    expect(validateUploadFileMetadata({
      fileName: "agreement.pdf",
      fileSize: MAX_UPLOAD_FILE_SIZE + 1,
      mimeType: "application/pdf",
    })).toContain("too large");
  });

  it("removes path traversal and unsafe filename characters", () => {
    expect(sanitizeUploadFileName("../../Client Contract (final).PDF"))
      .toBe("Client_Contract_final.pdf");
  });

  it("only accepts objects inside the authenticated user's folder", () => {
    expect(isOwnedUploadPath("user-1/file.pdf", "user-1")).toBe(true);
    expect(isOwnedUploadPath("user-10/file.pdf", "user-1")).toBe(false);
    expect(isOwnedUploadPath("user-1/../user-2/file.pdf", "user-1")).toBe(false);
  });

  it("checks the uploaded bytes instead of trusting the extension", () => {
    expect(validateUploadedFileBytes(new TextEncoder().encode("%PDF-1.7\n"), "pdf"))
      .toBeNull();
    expect(validateUploadedFileBytes(new TextEncoder().encode("not a pdf"), "pdf"))
      .toBe("The uploaded file is not a valid PDF");
    expect(validateUploadedFileBytes(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "png",
    )).toBeNull();
    expect(validateUploadedFileBytes(new Uint8Array([0xff, 0xd8, 0xff]), "jpg"))
      .toBeNull();
    expect(validateUploadedFileBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "docx"))
      .toBeNull();
  });
});
