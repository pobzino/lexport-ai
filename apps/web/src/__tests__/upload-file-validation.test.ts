import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_FILE_SIZE,
  getUploadFileType,
  isOwnedUploadPath,
  sanitizeUploadFileName,
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
});
