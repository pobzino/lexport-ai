import {
  PDFDocument,
  PDFImage,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

const BRAND = {
  navy: rgb(32 / 255, 46 / 255, 70 / 255),
  blue: rgb(82 / 255, 158 / 255, 198 / 255),
  green: rgb(16 / 255, 185 / 255, 129 / 255),
  ink: rgb(15 / 255, 23 / 255, 42 / 255),
  slate: rgb(100 / 255, 116 / 255, 139 / 255),
  border: rgb(226 / 255, 232 / 255, 240 / 255),
  surface: rgb(248 / 255, 250 / 255, 252 / 255),
  white: rgb(1, 1, 1),
};

const FIELD_EDITOR_REFERENCE_WIDTH = 800;

export type UploadedSourceFileType = "pdf" | "jpg" | "png";

export interface UploadedSignatureField {
  id: string;
  type: "signature" | "initials" | "date" | "text" | "checkbox" | string;
  label?: string | null;
  signer_role: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  page?: number | null;
}

export interface UploadedFieldValue {
  field_id: string;
  signature_request_id: string;
  value?: string | null;
  signature_id?: string | null;
}

export interface UploadedSignatureRecord {
  id: string;
  signature_request_id?: string | null;
  signature_data: string;
  signed_at?: string | null;
  image_hash?: string | null;
}

export interface UploadedSignatureRequest {
  id?: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  status: string;
  signed_at?: string | null;
  email_verified_at?: string | null;
}

interface GenerateUploadedContractPdfInput {
  sourceBytes: Uint8Array;
  sourceFileType: UploadedSourceFileType;
  contract: {
    id: string;
    title: string;
    status: string;
    contentHash?: string | null;
    completedAt?: string | null;
  };
  signatureFields?: UploadedSignatureField[];
  fieldValues?: UploadedFieldValue[];
  signatures?: UploadedSignatureRecord[];
  signatureRequests?: UploadedSignatureRequest[];
  appendCompletionPage?: boolean;
}

function safeText(value: string | null | undefined): string {
  return (value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safeText(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitText(text: string, font: PDFFont, maxSize: number, width: number): number {
  let size = maxSize;
  while (size > 7 && font.widthOfTextAtSize(safeText(text), size) > width) size -= 0.5;
  return size;
}

function extractStoredSignature(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  try {
    const parsed = JSON.parse(value) as { kind?: string; dataUrl?: string };
    return parsed.kind === "signature" && parsed.dataUrl?.startsWith("data:image/")
      ? parsed.dataUrl
      : null;
  } catch {
    return null;
  }
}

async function embedDataImage(
  pdfDoc: PDFDocument,
  dataUrl: string,
): Promise<PDFImage | null> {
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  return match[1].toLowerCase() === "png"
    ? pdfDoc.embedPng(bytes)
    : pdfDoc.embedJpg(bytes);
}

function getFieldBox(page: PDFPage, field: UploadedSignatureField) {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const scale = pageWidth / FIELD_EDITOR_REFERENCE_WIDTH;
  const width = Math.min(
    Math.max(field.width * scale, 14),
    Math.max(pageWidth - 8, 14),
  );
  const height = Math.min(
    Math.max(field.height * scale, 12),
    Math.max(pageHeight - 8, 12),
  );
  const x = Math.min(
    Math.max((field.position_x / 100) * pageWidth, 4),
    Math.max(pageWidth - width - 4, 4),
  );
  const top = Math.min(
    Math.max((field.position_y / 100) * pageHeight, 4),
    Math.max(pageHeight - height - 4, 4),
  );
  return { x, y: pageHeight - top - height, width, height };
}

async function createSourceDocument(
  sourceBytes: Uint8Array,
  sourceFileType: UploadedSourceFileType,
): Promise<PDFDocument> {
  if (sourceFileType === "pdf") {
    return PDFDocument.load(sourceBytes, { ignoreEncryption: false });
  }

  const pdfDoc = await PDFDocument.create();
  const image = sourceFileType === "png"
    ? await pdfDoc.embedPng(sourceBytes)
    : await pdfDoc.embedJpg(sourceBytes);
  const maxWidth = 595.28;
  const maxHeight = 841.89;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = image.width * scale;
  const height = image.height * scale;
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return pdfDoc;
}

async function drawCompletedField(
  pdfDoc: PDFDocument,
  page: PDFPage,
  field: UploadedSignatureField,
  fieldValue: UploadedFieldValue,
  signatures: UploadedSignatureRecord[],
  regular: PDFFont,
  bold: PDFFont,
) {
  const box = getFieldBox(page, field);
  const linkedSignature = signatures.find((signature) =>
    signature.id === fieldValue.signature_id ||
    signature.signature_request_id === fieldValue.signature_request_id
  );
  const storedSignature = extractStoredSignature(fieldValue.value);
  const signatureData = storedSignature || linkedSignature?.signature_data || null;

  if ((field.type === "signature" || field.type === "initials") && signatureData) {
    const image = await embedDataImage(pdfDoc, signatureData);
    if (image) {
      const scale = Math.min(box.width / image.width, box.height / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, {
        x: box.x + (box.width - width) / 2,
        y: box.y + (box.height - height) / 2,
        width,
        height,
      });
      return;
    }
  }

  if (field.type === "checkbox") {
    const checked = !fieldValue.value || !["false", "0", "off", "no"].includes(
      fieldValue.value.toLowerCase(),
    );
    if (checked) {
      const size = Math.min(box.width, box.height, 16);
      page.drawRectangle({
        x: box.x,
        y: box.y + (box.height - size) / 2,
        width: size,
        height: size,
        borderColor: BRAND.navy,
        borderWidth: 1,
      });
      page.drawText("X", {
        x: box.x + 3,
        y: box.y + (box.height - size) / 2 + 2,
        size: Math.max(size - 5, 7),
        font: bold,
        color: BRAND.navy,
      });
    }
    return;
  }

  const value = safeText(fieldValue.value);
  if (!value || value.startsWith("{")) return;
  const fontSize = fitText(value, regular, Math.min(11, box.height * 0.65), box.width);
  page.drawText(value, {
    x: box.x,
    y: box.y + Math.max((box.height - fontSize) / 2, 1),
    size: fontSize,
    font: regular,
    color: BRAND.ink,
    maxWidth: box.width,
  });
}

function drawLexportWordmark(
  page: PDFPage,
  bold: PDFFont,
  x: number,
  y: number,
  inverse = false,
) {
  page.drawText("LEX", {
    x,
    y,
    size: 17,
    font: bold,
    color: inverse ? BRAND.white : BRAND.ink,
  });
  page.drawText("PORT", {
    x: x + bold.widthOfTextAtSize("LEX", 17),
    y,
    size: 17,
    font: bold,
    color: BRAND.blue,
  });
}

function appendCompletionSummary(
  pdfDoc: PDFDocument,
  contract: GenerateUploadedContractPdfInput["contract"],
  signatureRequests: UploadedSignatureRequest[],
  regular: PDFFont,
  bold: PDFFont,
) {
  const firstPage = pdfDoc.getPages()[0];
  const firstSize = firstPage?.getSize() || { width: 612, height: 792 };
  const pageWidth = firstSize.width >= 500 ? firstSize.width : 612;
  const pageHeight = firstSize.height >= 700 ? firstSize.height : 792;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  page.drawRectangle({
    x: 0,
    y: pageHeight - 96,
    width: pageWidth,
    height: 96,
    color: BRAND.navy,
  });
  drawLexportWordmark(page, bold, margin, pageHeight - 55, true);
  page.drawText("COMPLETION RECORD", {
    x: margin,
    y: pageHeight - 76,
    size: 8,
    font: bold,
    color: rgb(184 / 255, 217 / 255, 236 / 255),
  });

  page.drawRectangle({
    x: pageWidth - margin - 92,
    y: pageHeight - 65,
    width: 92,
    height: 24,
    color: BRAND.green,
  });
  page.drawText("COMPLETED", {
    x: pageWidth - margin - 77,
    y: pageHeight - 57,
    size: 8,
    font: bold,
    color: BRAND.white,
  });

  let y = pageHeight - 138;
  page.drawText("Document completion summary", {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: BRAND.blue,
  });
  y -= 30;
  const titleLines = wrapText(contract.title, bold, 22, contentWidth);
  for (const line of titleLines.slice(0, 3)) {
    page.drawText(line, { x: margin, y, size: 22, font: bold, color: BRAND.ink });
    y -= 27;
  }

  y -= 14;
  page.drawRectangle({
    x: margin,
    y: y - 54,
    width: contentWidth,
    height: 64,
    color: BRAND.surface,
    borderColor: BRAND.border,
    borderWidth: 1,
  });
  const completedAt = contract.completedAt
    ? new Date(contract.completedAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      })
    : "Recorded by Lexport";
  page.drawText("DOCUMENT ID", { x: margin + 16, y: y - 12, size: 7, font: bold, color: BRAND.slate });
  page.drawText(safeText(contract.id), { x: margin + 16, y: y - 30, size: 9, font: regular, color: BRAND.ink });
  page.drawText("COMPLETED", { x: margin + contentWidth / 2, y: y - 12, size: 7, font: bold, color: BRAND.slate });
  page.drawText(safeText(completedAt), { x: margin + contentWidth / 2, y: y - 30, size: 9, font: regular, color: BRAND.ink });
  y -= 88;

  page.drawText("SIGNERS", { x: margin, y, size: 8, font: bold, color: BRAND.slate });
  y -= 24;
  const completedSigners = signatureRequests.filter((request) => request.status === "signed");
  for (const signer of completedSigners.slice(0, 5)) {
    page.drawLine({
      start: { x: margin, y: y - 48 },
      end: { x: pageWidth - margin, y: y - 48 },
      thickness: 0.7,
      color: BRAND.border,
    });
    page.drawText(safeText(signer.signer_name), { x: margin, y: y - 12, size: 11, font: bold, color: BRAND.ink });
    page.drawText(safeText(signer.signer_role || "Signer"), { x: margin, y: y - 30, size: 8, font: regular, color: BRAND.slate });
    const signedAt = signer.signed_at
      ? new Date(signer.signed_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " UTC"
      : "Signature recorded";
    const signedWidth = regular.widthOfTextAtSize(safeText(signedAt), 8);
    page.drawText(safeText(signedAt), { x: pageWidth - margin - signedWidth, y: y - 12, size: 8, font: regular, color: BRAND.slate });
    const verification = signer.email_verified_at ? "Email verified" : "Signature recorded";
    const verificationWidth = regular.widthOfTextAtSize(verification, 8);
    page.drawText(verification, { x: pageWidth - margin - verificationWidth, y: y - 30, size: 8, font: regular, color: BRAND.green });
    y -= 56;
  }
  if (completedSigners.length > 5) {
    page.drawText(`+ ${completedSigners.length - 5} additional signer(s)`, {
      x: margin,
      y: y - 4,
      size: 8,
      font: regular,
      color: BRAND.slate,
    });
  }

  const hash = safeText(contract.contentHash || "Not recorded");
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 78, color: BRAND.surface });
  page.drawText("DOCUMENT FINGERPRINT", { x: margin, y: 49, size: 7, font: bold, color: BRAND.slate });
  page.drawText(hash.length > 70 ? `${hash.slice(0, 67)}...` : hash, {
    x: margin,
    y: 31,
    size: 7.5,
    font: regular,
    color: BRAND.ink,
  });
  page.drawText("Original pages preserved; signer fields flattened by Lexport.", {
    x: margin,
    y: 15,
    size: 7,
    font: regular,
    color: BRAND.slate,
  });
}

export async function generateUploadedContractPdf({
  sourceBytes,
  sourceFileType,
  contract,
  signatureFields = [],
  fieldValues = [],
  signatures = [],
  signatureRequests = [],
  appendCompletionPage = false,
}: GenerateUploadedContractPdfInput): Promise<Uint8Array> {
  const pdfDoc = await createSourceDocument(sourceBytes, sourceFileType);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const valuesByField = new Map(fieldValues.map((value) => [value.field_id, value]));

  for (const field of signatureFields) {
    const value = valuesByField.get(field.id);
    if (!value) continue;
    const page = pages[Math.max(0, Math.min((field.page || 1) - 1, pages.length - 1))];
    if (!page) continue;
    await drawCompletedField(pdfDoc, page, field, value, signatures, regular, bold);
  }

  const isComplete = ["signed", "completed", "sealed"].includes(contract.status);
  if (appendCompletionPage && isComplete) {
    appendCompletionSummary(pdfDoc, contract, signatureRequests, regular, bold);
  }

  pdfDoc.setTitle(safeText(contract.title));
  pdfDoc.setAuthor("Lexport");
  pdfDoc.setCreator("Lexport");
  pdfDoc.setProducer("Lexport document engine");
  pdfDoc.setSubject("Electronically signed contract");

  return pdfDoc.save({ useObjectStreams: true });
}
