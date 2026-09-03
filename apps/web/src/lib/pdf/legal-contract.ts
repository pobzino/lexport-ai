import {
  PDFDocument,
  type PDFImage,
  PDFFont,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import { loadPdfLogo } from "@/lib/pdf/logo";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR = {
  black: rgb(0.06, 0.06, 0.07),
  grey: rgb(0.4, 0.4, 0.42),
  lightGrey: rgb(0.78, 0.78, 0.8),
  watermark: rgb(0.93, 0.93, 0.94),
};

export interface LegalContractContent {
  preamble?: string | null;
  recitals?: string | null;
  clauses?: Array<{
    id?: string;
    title: string;
    content: string;
    type?: string;
    order?: number;
  }>;
  signatureBlock?: string | null;
}

export interface LegalDocumentIdentity {
  companyName?: string | null;
  companyAddress?: string | null;
  companyLogoUrl?: string | null;
}

export interface LegalSignatureRequest {
  id?: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  status: string;
  signed_at?: string | null;
}

export interface LegalSignatureData {
  signatureRequestId?: string | null;
  signerName: string;
  signerEmail: string;
  signerRole?: string | null;
  signatureData: string;
  signedAt: string;
}

interface RenderLegalContractInput {
  title: string;
  jurisdiction?: string | null;
  content: LegalContractContent;
  identity?: LegalDocumentIdentity;
  signatureRequests?: LegalSignatureRequest[];
  signatures?: LegalSignatureData[];
  isSigned?: boolean;
}

function safeText(value: string | null | undefined): string {
  return (value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

function singleLine(value: string, maxLength: number): string {
  const cleaned = safeText(value).replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength
    ? `${cleaned.slice(0, Math.max(maxLength - 3, 0))}...`
    : cleaned;
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = safeText(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

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

function getJurisdictionLabel(jurisdiction: string | null | undefined): string {
  if (!jurisdiction) return "";
  const labels: Record<string, string> = {
    us_california: "State of California, USA",
    us_texas: "State of Texas, USA",
    us_new_york: "State of New York, USA",
    uk: "England and Wales, United Kingdom",
  };
  return labels[jurisdiction] || jurisdiction;
}

async function embedSignature(
  pdfDoc: PDFDocument,
  dataUrl: string | null | undefined,
): Promise<PDFImage | null> {
  const match = dataUrl?.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  try {
    const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
    return match[1].toLowerCase() === "png"
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function renderLegalContractPdf({
  title,
  jurisdiction,
  content,
  identity = {},
  signatureRequests = [],
  signatures = [],
  isSigned = false,
}: RenderLegalContractInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const logo = await loadPdfLogo(pdfDoc, identity.companyLogoUrl);
  const companyName = safeText(identity.companyName || "").trim();
  const documentTitle = safeText(title).trim() || "Agreement";

  let currentPage!: PDFPage;
  let y = 0;

  const addPage = (firstPage = false) => {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN - 8;

    if (firstPage) {
      if (logo) {
        const scale = Math.min(150 / logo.width, 46 / logo.height, 1);
        const width = logo.width * scale;
        const height = logo.height * scale;
        currentPage.drawImage(logo, {
          x: MARGIN,
          y: y - height,
          width,
          height,
        });
        y -= height + 30;
      } else if (companyName) {
        currentPage.drawText(companyName, {
          x: MARGIN,
          y: y - 22,
          size: 18,
          font: bold,
          color: COLOR.black,
        });
        y -= 48;
      }

      currentPage.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.8,
        color: COLOR.black,
      });
      y -= 38;
      currentPage.drawText("AGREEMENT", {
        x: MARGIN,
        y,
        size: 8,
        font: bold,
        color: COLOR.grey,
      });
      y -= 34;
      for (const line of wrapText(documentTitle, bold, 23, CONTENT_WIDTH)) {
        currentPage.drawText(line, {
          x: MARGIN,
          y,
          size: 23,
          font: bold,
          color: COLOR.black,
        });
        y -= 28;
      }
      const governingLaw = getJurisdictionLabel(jurisdiction);
      if (governingLaw) {
        y -= 2;
        currentPage.drawText(`Governing law: ${safeText(governingLaw)}`, {
          x: MARGIN,
          y,
          size: 9,
          font: regular,
          color: COLOR.grey,
        });
        y -= 31;
      } else {
        y -= 20;
      }
    }

    return currentPage;
  };

  addPage(true);

  const ensureSpace = (required: number) => {
    if (y - required < MARGIN + 25) addPage(false);
  };

  const drawFlowText = (
    value: string,
    options: {
      font?: PDFFont;
      size?: number;
      lineHeight?: number;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {},
  ) => {
    const font = options.font || regular;
    const size = options.size || 10.25;
    const lineHeight = options.lineHeight || 14;
    const color = options.color || COLOR.black;
    const maxWidth = options.maxWidth || CONTENT_WIDTH;
    for (const line of wrapText(value, font, size, maxWidth)) {
      ensureSpace(lineHeight);
      currentPage.drawText(line, {
        x: MARGIN,
        y,
        size,
        font,
        color,
      });
      y -= lineHeight;
    }
  };

  const drawParagraphs = (
    value: string | null | undefined,
    options: Parameters<typeof drawFlowText>[1] = {},
  ) => {
    for (const paragraph of safeText(value).split(/\n+/).map((part) => part.trim()).filter(Boolean)) {
      drawFlowText(paragraph, options);
      y -= 6;
    }
  };

  const drawSectionHeading = (value: string) => {
    ensureSpace(48);
    y -= 9;
    drawFlowText(value, { font: bold, size: 14, lineHeight: 17 });
    y -= 7;
  };

  if (content.preamble) {
    drawSectionHeading("Parties and background");
    drawParagraphs(content.preamble);
  }

  if (content.recitals) {
    drawSectionHeading("Recitals");
    drawParagraphs(content.recitals, { font: italic });
  }

  for (const clause of content.clauses || []) {
    drawSectionHeading(safeText(clause.title));
    drawParagraphs(clause.content);
  }

  const requests = signatureRequests.length
    ? signatureRequests
    : signatures.map((signature) => ({
        id: signature.signatureRequestId || undefined,
        signer_name: signature.signerName,
        signer_email: signature.signerEmail,
        signer_role: signature.signerRole || "Signer",
        status: "signed",
        signed_at: signature.signedAt,
      }));

  if (requests.length || content.signatureBlock) {
    addPage(false);
    currentPage.drawText("EXECUTION", {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: COLOR.grey,
    });
    y -= 32;
    for (const line of wrapText(documentTitle, bold, 22, CONTENT_WIDTH)) {
      currentPage.drawText(line, {
        x: MARGIN,
        y,
        size: 22,
        font: bold,
        color: COLOR.black,
      });
      y -= 27;
    }
    y -= 7;
    drawFlowText(
      "The parties confirm that they have read and agree to this agreement. It takes effect on the date of the last signature below.",
      { size: 10, lineHeight: 14 },
    );
    y -= 23;

    if (requests.length) {
      currentPage.drawText("Signed by the parties", {
        x: MARGIN,
        y,
        size: 14,
        font: bold,
        color: COLOR.black,
      });
      y -= 30;

      for (const request of requests) {
        ensureSpace(142);
        const signature = signatures.find((candidate) =>
          (request.id && candidate.signatureRequestId === request.id) ||
          candidate.signerRole === request.signer_role
        );
        const signatureImage = await embedSignature(
          pdfDoc,
          signature?.signatureData,
        );
        const rightX = MARGIN + 250;
        const leftWidth = 218;
        const rightWidth = CONTENT_WIDTH - 250;

        currentPage.drawText(singleLine(request.signer_role || "Signer", 48).toUpperCase(), {
          x: MARGIN,
          y,
          size: 10.5,
          font: bold,
          color: COLOR.black,
        });
        y -= 28;
        currentPage.drawText("PRINTED NAME", {
          x: MARGIN,
          y,
          size: 7,
          font: bold,
          color: COLOR.grey,
        });
        currentPage.drawText("SIGNATURE", {
          x: rightX,
          y,
          size: 7,
          font: bold,
          color: COLOR.grey,
        });
        const firstLineY = y - 39;
        currentPage.drawText(singleLine(request.signer_name, 62), {
          x: MARGIN,
          y: firstLineY + 7,
          size: 9.5,
          font: bold,
          color: COLOR.black,
        });
        if (signatureImage) {
          const scale = Math.min(
            (rightWidth - 8) / signatureImage.width,
            30 / signatureImage.height,
          );
          const width = signatureImage.width * scale;
          const height = signatureImage.height * scale;
          currentPage.drawImage(signatureImage, {
            x: rightX,
            y: firstLineY + 3,
            width,
            height,
          });
        }
        currentPage.drawLine({
          start: { x: MARGIN, y: firstLineY },
          end: { x: MARGIN + leftWidth, y: firstLineY },
          thickness: 0.6,
          color: COLOR.lightGrey,
        });
        currentPage.drawLine({
          start: { x: rightX, y: firstLineY },
          end: { x: PAGE_WIDTH - MARGIN, y: firstLineY },
          thickness: 0.6,
          color: COLOR.lightGrey,
        });

        const secondLabelY = y - 70;
        currentPage.drawText("EMAIL", {
          x: MARGIN,
          y: secondLabelY,
          size: 7,
          font: bold,
          color: COLOR.grey,
        });
        currentPage.drawText("DATE", {
          x: rightX,
          y: secondLabelY,
          size: 7,
          font: bold,
          color: COLOR.grey,
        });
        const secondLineY = secondLabelY - 39;
        currentPage.drawText(singleLine(request.signer_email, 70), {
          x: MARGIN,
          y: secondLineY + 7,
          size: 9.5,
          font: regular,
          color: COLOR.black,
        });
        const signedDate = formatDate(signature?.signedAt || request.signed_at);
        if (signedDate) {
          currentPage.drawText(signedDate, {
            x: rightX,
            y: secondLineY + 7,
            size: 9.5,
            font: regular,
            color: COLOR.black,
          });
        }
        currentPage.drawLine({
          start: { x: MARGIN, y: secondLineY },
          end: { x: MARGIN + leftWidth, y: secondLineY },
          thickness: 0.6,
          color: COLOR.lightGrey,
        });
        currentPage.drawLine({
          start: { x: rightX, y: secondLineY },
          end: { x: PAGE_WIDTH - MARGIN, y: secondLineY },
          thickness: 0.6,
          color: COLOR.lightGrey,
        });
        y = secondLineY - 36;
      }
    } else if (content.signatureBlock) {
      drawParagraphs(content.signatureBlock);
    }
  }

  const pages = pdfDoc.getPages();
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const leftHeader = singleLine(documentTitle, 50).toUpperCase();
    const rightHeader = singleLine(companyName || "AGREEMENT", 34).toUpperCase();
    page.drawText(leftHeader, {
      x: MARGIN,
      y: PAGE_HEIGHT - 32,
      size: 7,
      font: bold,
      color: COLOR.grey,
    });
    const rightHeaderWidth = bold.widthOfTextAtSize(rightHeader, 7);
    page.drawText(rightHeader, {
      x: PAGE_WIDTH - MARGIN - rightHeaderWidth,
      y: PAGE_HEIGHT - 32,
      size: 7,
      font: bold,
      color: COLOR.black,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 38 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 38 },
      thickness: 0.45,
      color: COLOR.lightGrey,
    });
    page.drawText("PRIVATE & CONFIDENTIAL", {
      x: MARGIN,
      y: 27,
      size: 7,
      font: bold,
      color: COLOR.grey,
    });
    const pageLabel = `Page ${index + 1}`;
    const pageLabelWidth = regular.widthOfTextAtSize(pageLabel, 7);
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - pageLabelWidth,
      y: 27,
      size: 7,
      font: regular,
      color: COLOR.grey,
    });

    if (!isSigned) {
      page.drawText("DRAFT - NOT EXECUTED", {
        x: 126,
        y: PAGE_HEIGHT / 2,
        size: 34,
        font: bold,
        color: COLOR.watermark,
        rotate: degrees(42),
      });
    }
  }

  pdfDoc.setTitle(documentTitle);
  if (companyName) pdfDoc.setAuthor(companyName);
  pdfDoc.setSubject("Legal agreement");

  return pdfDoc.save({ useObjectStreams: true });
}
