import {
  PDFDocument,
  PDFDict,
  PDFImage,
  PDFName,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

const BRAND = {
  navy: rgb(32 / 255, 46 / 255, 70 / 255),
  ink: rgb(15 / 255, 23 / 255, 42 / 255),
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

interface GenerateUploadedContractPdfInput {
  sourceBytes: Uint8Array;
  sourceFileType: UploadedSourceFileType;
  signatureFields?: UploadedSignatureField[];
  fieldValues?: UploadedFieldValue[];
  signatures?: UploadedSignatureRecord[];
}

function safeText(value: string | null | undefined): string {
  return (value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
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

/**
 * Keep the visible legal document intact while removing executable or embedded
 * payloads that should never be carried into a signing copy.
 */
function removeActivePdfContent(pdfDoc: PDFDocument) {
  pdfDoc.catalog.delete(PDFName.of("OpenAction"));
  pdfDoc.catalog.delete(PDFName.of("AA"));

  const names = pdfDoc.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  names?.delete(PDFName.of("JavaScript"));
  names?.delete(PDFName.of("EmbeddedFiles"));

  for (const page of pdfDoc.getPages()) {
    page.node.delete(PDFName.of("AA"));
  }
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

export async function generateUploadedContractPdf({
  sourceBytes,
  sourceFileType,
  signatureFields = [],
  fieldValues = [],
  signatures = [],
}: GenerateUploadedContractPdfInput): Promise<Uint8Array> {
  const pdfDoc = await createSourceDocument(sourceBytes, sourceFileType);
  removeActivePdfContent(pdfDoc);
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

  return pdfDoc.save({ useObjectStreams: true });
}
