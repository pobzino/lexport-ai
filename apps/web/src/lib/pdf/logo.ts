import { PDFDocument, type PDFImage } from "pdf-lib";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function isPrivateHostname(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    value === "localhost" ||
    value === "::1" ||
    value.endsWith(".local") ||
    value === "169.254.169.254"
  ) {
    return true;
  }

  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

export function isSafePdfLogoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const localDevelopmentUrl =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    return (
      (url.protocol === "https:" || localDevelopmentUrl) &&
      (!isPrivateHostname(url.hostname) || localDevelopmentUrl)
    );
  } catch {
    return false;
  }
}

export async function loadPdfLogo(
  pdfDoc: PDFDocument,
  logoUrl: string | null | undefined,
): Promise<PDFImage | null> {
  if (!logoUrl || !isSafePdfLogoUrl(logoUrl)) return null;

  try {
    const response = await fetch(logoUrl, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_LOGO_BYTES) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_LOGO_BYTES) return null;

    const isPng =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;

    if (isPng) return await pdfDoc.embedPng(bytes);
    if (isJpeg) return await pdfDoc.embedJpg(bytes);
  } catch (error) {
    console.warn("Unable to load document logo:", error);
  }

  return null;
}
