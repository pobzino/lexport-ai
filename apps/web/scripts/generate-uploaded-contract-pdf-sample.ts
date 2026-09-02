import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { generateUploadedContractPdf } from "../src/lib/pdf/uploaded-contract.ts";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const outputPath = path.join(
  workspaceRoot,
  "output/pdf/uploaded-contract-redesign-sample.pdf",
);
const tmpDir = path.join(workspaceRoot, "tmp/pdfs/uploaded-contract-redesign");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createOriginalContract() {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 58;
  const ink = rgb(26 / 255, 34 / 255, 48 / 255);
  const muted = rgb(103 / 255, 116 / 255, 137 / 255);
  const accent = rgb(17 / 255, 94 / 255, 89 / 255);
  const border = rgb(222 / 255, 228 / 255, 234 / 255);

  const drawFooter = (page: ReturnType<typeof pdf.addPage>, pageNumber: number) => {
    page.drawLine({
      start: { x: margin, y: 44 },
      end: { x: pageWidth - margin, y: 44 },
      thickness: 0.7,
      color: border,
    });
    page.drawText("Northstar Studios Ltd. - Confidential", {
      x: margin,
      y: 27,
      size: 7.5,
      font: regular,
      color: muted,
    });
    page.drawText(String(pageNumber), {
      x: pageWidth - margin - 5,
      y: 27,
      size: 7.5,
      font: regular,
      color: muted,
    });
  };

  const first = pdf.addPage([pageWidth, pageHeight]);
  first.drawText("NORTHSTAR", { x: margin, y: 778, size: 13, font: bold, color: accent });
  first.drawText("STUDIOS", { x: margin + 84, y: 778, size: 13, font: bold, color: ink });
  first.drawText("INDEPENDENT CONTRACTOR", { x: margin, y: 704, size: 25, font: bold, color: ink });
  first.drawText("AGREEMENT", { x: margin, y: 673, size: 25, font: bold, color: ink });
  first.drawText("Effective 2 September 2026", { x: margin, y: 638, size: 10, font: regular, color: muted });
  first.drawRectangle({ x: margin, y: 583, width: pageWidth - margin * 2, height: 34, color: rgb(244 / 255, 247 / 255, 248 / 255) });
  first.drawText("PARTIES", { x: margin + 14, y: 595, size: 8, font: bold, color: accent });
  first.drawText("Northstar Studios Ltd. and Alex Morgan", { x: margin + 82, y: 594, size: 10, font: regular, color: ink });

  let y = 548;
  const sections = [
    ["1. Engagement", "The Company appoints the Contractor to provide product strategy and design services described in each agreed statement of work. The Contractor accepts the appointment on the terms set out in this agreement."],
    ["2. Services and delivery", "Services will be performed with reasonable skill and care. Delivery dates are estimates unless expressly stated as fixed milestones. The parties will collaborate in good faith and promptly provide information required for delivery."],
    ["3. Fees and expenses", "The Company will pay approved invoices within fourteen days. Pre-approved, reasonable expenses will be reimbursed against receipts. All amounts are exclusive of applicable taxes."],
    ["4. Intellectual property", "Once all fees are paid, deliverables created specifically for the Company transfer to the Company. The Contractor retains ownership of pre-existing tools, methods, templates and general know-how."],
  ];
  for (const [heading, body] of sections) {
    first.drawText(heading, { x: margin, y, size: 11, font: bold, color: ink });
    y -= 19;
    for (const line of wrap(body, regular, 9.5, pageWidth - margin * 2)) {
      first.drawText(line, { x: margin, y, size: 9.5, font: regular, color: ink });
      y -= 14;
    }
    y -= 16;
  }
  drawFooter(first, 1);

  const second = pdf.addPage([pageWidth, pageHeight]);
  second.drawText("NORTHSTAR STUDIOS", { x: margin, y: 778, size: 10, font: bold, color: accent });
  second.drawText("Independent Contractor Agreement", { x: margin, y: 742, size: 18, font: bold, color: ink });
  y = 697;
  const finalSections = [
    ["5. Confidentiality", "Each party will protect confidential information received from the other and use it only to perform or receive the services. These obligations continue after this agreement ends."],
    ["6. Term and termination", "Either party may terminate on fourteen days' written notice. Accrued payment obligations, confidentiality, intellectual property and liability provisions survive termination."],
    ["7. General", "This agreement is governed by the laws of England and Wales. It contains the entire agreement between the parties and may be amended only in writing signed by both parties."],
  ];
  for (const [heading, body] of finalSections) {
    second.drawText(heading, { x: margin, y, size: 11, font: bold, color: ink });
    y -= 19;
    for (const line of wrap(body, regular, 9.5, pageWidth - margin * 2)) {
      second.drawText(line, { x: margin, y, size: 9.5, font: regular, color: ink });
      y -= 14;
    }
    y -= 18;
  }

  second.drawLine({ start: { x: margin, y: 407 }, end: { x: pageWidth - margin, y: 407 }, thickness: 0.8, color: border });
  second.drawText("SIGNATURES", { x: margin, y: 376, size: 8, font: bold, color: accent });
  second.drawText("For Northstar Studios Ltd.", { x: margin, y: 342, size: 9, font: bold, color: ink });
  second.drawText("For the Contractor", { x: 328, y: 342, size: 9, font: bold, color: ink });
  second.drawLine({ start: { x: margin, y: 264 }, end: { x: 252, y: 264 }, thickness: 0.8, color: muted });
  second.drawLine({ start: { x: 328, y: 264 }, end: { x: pageWidth - margin, y: 264 }, thickness: 0.8, color: muted });
  second.drawText("Signature", { x: margin, y: 250, size: 7.5, font: regular, color: muted });
  second.drawText("Signature", { x: 328, y: 250, size: 7.5, font: regular, color: muted });
  second.drawLine({ start: { x: margin, y: 205 }, end: { x: 252, y: 205 }, thickness: 0.8, color: muted });
  second.drawLine({ start: { x: 328, y: 205 }, end: { x: pageWidth - margin, y: 205 }, thickness: 0.8, color: muted });
  second.drawText("Date", { x: margin, y: 191, size: 7.5, font: regular, color: muted });
  second.drawText("Date", { x: 328, y: 191, size: 7.5, font: regular, color: muted });
  drawFooter(second, 2);

  return pdf.save();
}

function createSignatureDataUrl() {
  const canvas = createCanvas(520, 150);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#17355c";
  context.font = "italic 52px serif";
  context.fillText("Alex Morgan", 18, 92);
  context.strokeStyle = "#17355c";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(14, 112);
  context.bezierCurveTo(150, 126, 330, 92, 505, 110);
  context.stroke();
  return canvas.toDataURL("image/png");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(tmpDir, { recursive: true });
const sourceBytes = await createOriginalContract();
await writeFile(path.join(tmpDir, "original.pdf"), sourceBytes);

const signatureData = createSignatureDataUrl();
const completedAt = "2026-09-02T14:32:00.000Z";
const result = await generateUploadedContractPdf({
  sourceBytes,
  sourceFileType: "pdf",
  contract: {
    id: "2d5d35a4-9fc2-4ca2-97aa-f1ba381a4fcb",
    title: "Independent Contractor Agreement",
    status: "completed",
    contentHash: "ba9736e57cda345c981336bcb971499ece023357ea24946f1c66ef99d91f4828",
    completedAt,
  },
  signatureFields: [
    { id: "signature-field", type: "signature", signer_role: "Contractor", position_x: 55, position_y: 62.4, width: 200, height: 60, page: 2 },
    { id: "date-field", type: "date", signer_role: "Contractor", position_x: 55, position_y: 72.8, width: 120, height: 30, page: 2 },
  ],
  fieldValues: [
    { field_id: "signature-field", signature_request_id: "request-1", signature_id: "signature-1", value: JSON.stringify({ kind: "signature", dataUrl: signatureData }) },
    { field_id: "date-field", signature_request_id: "request-1", value: "2 September 2026" },
  ],
  signatures: [
    { id: "signature-1", signature_request_id: "request-1", signature_data: signatureData, signed_at: completedAt },
  ],
  signatureRequests: [
    { id: "request-1", signer_name: "Alex Morgan", signer_email: "alex@example.com", signer_role: "Contractor", status: "signed", signed_at: completedAt, email_verified_at: "2026-09-02T14:28:00.000Z" },
  ],
  appendCompletionPage: true,
});

await writeFile(outputPath, result);
console.log(outputPath);
