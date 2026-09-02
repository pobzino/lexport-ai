import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateUploadedContractPdf } from "@/lib/pdf/uploaded-contract";

async function createSourcePdf() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Original Consulting Agreement");
  pdf.setAuthor("Example Agency");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pdf.addPage([612, 792]);
  first.drawText("ORIGINAL CONTRACT PAGE ONE", {
    x: 72,
    y: 700,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  const second = pdf.addPage([595.28, 841.89]);
  second.drawText("ORIGINAL CONTRACT PAGE TWO", {
    x: 72,
    y: 750,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  return pdf.save();
}

describe("uploaded contract PDF preservation", () => {
  it("preserves completed source pages and source identity", async () => {
    const sourceBytes = await createSourcePdf();
    const output = await generateUploadedContractPdf({
      sourceBytes,
      sourceFileType: "pdf",
      contract: {
        id: "contract-123",
        title: "Original Consulting Agreement",
        status: "completed",
        contentHash: "abc123",
        completedAt: "2026-09-02T12:00:00.000Z",
      },
    });

    const result = await PDFDocument.load(output);
    expect(result.getPageCount()).toBe(2);
    expect(result.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    expect(result.getPage(1).getSize().width).toBeCloseTo(595.28, 1);
    expect(result.getPage(1).getSize().height).toBeCloseTo(841.89, 1);
    expect(result.getTitle()).toBe("Original Consulting Agreement");
    expect(result.getAuthor()).toBe("Example Agency");
  });

  it("does not append a completion page to a draft", async () => {
    const sourceBytes = await createSourcePdf();
    const output = await generateUploadedContractPdf({
      sourceBytes,
      sourceFileType: "pdf",
      contract: {
        id: "contract-456",
        title: "Draft Agreement",
        status: "draft",
      },
    });

    const result = await PDFDocument.load(output);
    expect(result.getPageCount()).toBe(2);
  });
});
