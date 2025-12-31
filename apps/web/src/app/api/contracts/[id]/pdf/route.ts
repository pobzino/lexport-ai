import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";

interface Clause {
  id: string;
  title: string;
  content: string;
  type: string;
  order: number;
}

interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signatureBlock: string;
}

interface SignatureData {
  signerName: string;
  signerEmail: string;
  signerRole?: string;
  signatureData: string;
  signedAt: string;
}

interface SignatureField {
  id: string;
  type: "signature" | "initials" | "date" | "text";
  label?: string;
  signer_role: string;
  required: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  order: number;
}

interface SignatureRequestData {
  signer_name: string;
  signer_email: string;
  signer_role: string;
  status: string;
}

interface FieldValue {
  id: string;
  field_id: string;
  signature_request_id: string;
  value?: string;
  signature_id?: string;
  completed_at: string;
}

interface SignatureRecord {
  id: string;
  signature_data: string;
  image_hash?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch contract with signatures
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Fetch signatures for this contract
    const { data: signatureRequests } = await supabase
      .from("signature_requests")
      .select(`
        signer_name,
        signer_email,
        signer_role,
        status,
        signed_at,
        signatures (
          signature_data,
          signed_at
        )
      `)
      .eq("contract_id", id)
      .eq("status", "signed");

    const signatures: SignatureData[] = (signatureRequests || [])
      .filter((sr: { signatures: unknown[] }) => sr.signatures && sr.signatures.length > 0)
      .map((sr: {
        signer_name: string;
        signer_email: string;
        signer_role?: string;
        signatures: { signature_data: string; signed_at: string }[];
      }) => ({
        signerName: sr.signer_name,
        signerEmail: sr.signer_email,
        signerRole: sr.signer_role,
        signatureData: sr.signatures[0].signature_data,
        signedAt: sr.signatures[0].signed_at,
      }));

    // Fetch signature fields
    const { data: signatureFields } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", id)
      .order("order", { ascending: true });

    // Fetch field values
    const { data: fieldValues } = await supabase
      .from("field_values")
      .select("*")
      .in(
        "field_id",
        (signatureFields || []).map((f: SignatureField) => f.id)
      );

    // Fetch all signatures for field values
    const { data: allSignatures } = await supabase
      .from("signatures")
      .select("id, signature_data, image_hash")
      .eq("contract_id", id);

    // Fetch all signature requests (for signer names by role)
    const { data: allSignatureRequests } = await supabase
      .from("signature_requests")
      .select("signer_name, signer_email, signer_role, status")
      .eq("contract_id", id);

    // For all contracts (generated or uploaded), generate PDF from content with signatures
    const content = contract.content as ContractContent;
    if (!content || !content.clauses) {
      return NextResponse.json(
        { error: "Contract has no content to generate PDF from" },
        { status: 400 }
      );
    }

    // Check if contract is signed (status can be 'signed' or 'completed')
    const isSigned = contract.status === "signed" || contract.status === "completed";

    // Generate PDF
    const pdfBytes = await generateContractPDF(
      contract.title,
      content,
      contract.jurisdiction,
      signatures,
      isSigned,
      (signatureFields || []) as SignatureField[],
      (fieldValues || []) as FieldValue[],
      (allSignatures || []) as SignatureRecord[],
      (allSignatureRequests || []) as SignatureRequestData[]
    );

    // Log audit event for PDF download
    const context = getRequestContextFromRequest(request);
    await auditLogger.pdfDownloaded(
      id,
      user.id,
      user.email || null,
      user.user_metadata?.name || user.user_metadata?.full_name || null,
      context
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(contract.title)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "_");
}

async function generateContractPDF(
  title: string,
  content: ContractContent,
  jurisdiction: string,
  signatures: SignatureData[],
  isSigned: boolean,
  signatureFields: SignatureField[] = [],
  fieldValues: FieldValue[] = [],
  allSignatures: SignatureRecord[] = [],
  signatureRequests: SignatureRequestData[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 72; // 1 inch
  const lineHeight = 14;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition - requiredSpace < margin) {
      addNewPage();
    }
  };

  const drawText = (
    text: string,
    options: {
      font?: typeof timesRomanFont;
      size?: number;
      color?: { r: number; g: number; b: number };
      align?: "left" | "center" | "right";
      maxWidth?: number;
    } = {}
  ) => {
    const font = options.font || timesRomanFont;
    const size = options.size || 11;
    const color = options.color || { r: 0, g: 0, b: 0 };
    const maxWidth = options.maxWidth || contentWidth;

    // Wrap text
    const words = text.split(" ");
    let lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    for (const line of lines) {
      checkPageBreak(lineHeight);

      let x = margin;
      if (options.align === "center") {
        const textWidth = font.widthOfTextAtSize(line, size);
        x = (pageWidth - textWidth) / 2;
      } else if (options.align === "right") {
        const textWidth = font.widthOfTextAtSize(line, size);
        x = pageWidth - margin - textWidth;
      }

      currentPage.drawText(line, {
        x,
        y: yPosition,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });

      yPosition -= lineHeight;
    }
  };

  const drawParagraph = (text: string, options: Parameters<typeof drawText>[1] = {}) => {
    const paragraphs = text.split("\n").filter(Boolean);
    for (const para of paragraphs) {
      drawText(para.trim(), options);
      yPosition -= lineHeight * 0.5; // Extra space between paragraphs
    }
  };

  // Title
  drawText(title.toUpperCase(), {
    font: timesRomanBoldFont,
    size: 16,
    align: "center",
  });
  yPosition -= lineHeight * 2;

  // Jurisdiction badge
  const jurisdictionLabel = getJurisdictionLabel(jurisdiction);
  drawText(`Governing Law: ${jurisdictionLabel}`, {
    font: timesRomanItalicFont,
    size: 10,
    color: { r: 0.4, g: 0.4, b: 0.4 },
    align: "center",
  });
  yPosition -= lineHeight * 2;

  // Preamble
  if (content.preamble) {
    drawParagraph(content.preamble);
    yPosition -= lineHeight;
  }

  // Recitals
  if (content.recitals) {
    drawText("RECITALS", {
      font: timesRomanBoldFont,
      size: 12,
    });
    yPosition -= lineHeight;
    drawParagraph(content.recitals, { font: timesRomanItalicFont });
    yPosition -= lineHeight;
  }

  // Clauses
  for (const clause of content.clauses) {
    checkPageBreak(lineHeight * 4);

    drawText(clause.title.toUpperCase(), {
      font: timesRomanBoldFont,
      size: 11,
    });
    yPosition -= lineHeight * 0.5;

    drawParagraph(clause.content);
    yPosition -= lineHeight;
  }

  // Signature Block with Field Placement
  checkPageBreak(lineHeight * 6);
  yPosition -= lineHeight * 2;

  drawText("SIGNATURES", {
    font: timesRomanBoldFont,
    size: 12,
  });
  yPosition -= lineHeight * 2;

  // Helper to format date as "December 30, 2025"
  const formatSignatureDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Use signature_requests as source of truth for who needs to sign (not signature_fields)
  // This ensures we show all actual signers, even if field roles don't match
  if (signatureRequests.length > 0) {
    // Layout constants
    const signatureLineWidth = 200;
    const dateLineWidth = 120;
    const dateX = margin + signatureLineWidth + 40;
    const rowHeight = 90;

    // Helper to get signature data by signer role
    const getSignatureByRole = (role: string): SignatureData | undefined => {
      return signatures.find((sig) => sig.signerRole === role);
    };

    // Helper to extract base/display role (e.g., "CLIENT - John" -> "CLIENT", "freelancer" -> "FREELANCER")
    const getDisplayRole = (signerRole: string): string => {
      const dashIndex = signerRole.indexOf(" - ");
      const baseRole = dashIndex > 0 ? signerRole.substring(0, dashIndex) : signerRole;
      return baseRole.toUpperCase();
    };

    // Iterate through all signature requests (actual signers)
    for (const signer of signatureRequests) {
      // Check for page break before each signer
      checkPageBreak(rowHeight + 20);

      const sigData = getSignatureByRole(signer.signer_role);
      let signatureImage: { image: Awaited<ReturnType<typeof pdfDoc.embedPng>>; width: number; height: number } | null = null;

      // Get signature image if signed
      if (sigData?.signatureData?.startsWith("data:image")) {
        try {
          const base64Data = sigData.signatureData.split(",")[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          let image;
          if (sigData.signatureData.includes("image/png")) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (sigData.signatureData.includes("image/jpeg") || sigData.signatureData.includes("image/jpg")) {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          if (image) {
            const maxWidth = 150;
            const maxHeight = 45;
            const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
            signatureImage = {
              image,
              width: image.width * scale,
              height: image.height * scale,
            };
          }
        } catch (imgError) {
          console.error("Error embedding signature:", imgError);
        }
      }

      // Get signed date
      const formattedDate = sigData?.signedAt ? formatSignatureDate(sigData.signedAt) : "";

      // Get signer name
      const signerName = signer.signer_name || sigData?.signerName || "";

      // --- Draw the signature row ---

      // Role label
      currentPage.drawText(getDisplayRole(signer.signer_role), {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanBoldFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      yPosition -= 55;

      // Signature image (if signed)
      if (signatureImage) {
        currentPage.drawImage(signatureImage.image, {
          x: margin,
          y: yPosition + 5,
          width: signatureImage.width,
          height: signatureImage.height,
        });
      }

      // Signature line
      currentPage.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: margin + signatureLineWidth, y: yPosition },
        thickness: 0.75,
        color: rgb(0.3, 0.3, 0.3),
      });

      // "Signature" label
      currentPage.drawText("Signature", {
        x: margin,
        y: yPosition - 12,
        size: 8,
        font: timesRomanItalicFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Date (same row, to the right)
      if (formattedDate) {
        currentPage.drawText(formattedDate, {
          x: dateX,
          y: yPosition + 5,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      // Date line
      currentPage.drawLine({
        start: { x: dateX, y: yPosition },
        end: { x: dateX + dateLineWidth, y: yPosition },
        thickness: 0.75,
        color: rgb(0.3, 0.3, 0.3),
      });

      // "Date" label
      currentPage.drawText("Date", {
        x: dateX,
        y: yPosition - 12,
        size: 8,
        font: timesRomanItalicFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      yPosition -= 30;

      // Printed Name (below signature)
      if (signerName) {
        currentPage.drawText(signerName, {
          x: margin,
          y: yPosition + 5,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      // Printed name line
      currentPage.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: margin + signatureLineWidth, y: yPosition },
        thickness: 0.75,
        color: rgb(0.3, 0.3, 0.3),
      });

      // "Printed Name" label
      currentPage.drawText("Printed Name", {
        x: margin,
        y: yPosition - 12,
        size: 8,
        font: timesRomanItalicFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Move to next row with spacing
      yPosition -= 35;
    }
  } else if (content.signatureBlock) {
    // Fallback to text-based signature block
    drawParagraph(content.signatureBlock);
  }

  // Add actual signatures if signed (legacy flow for contracts without fields)
  if (isSigned && signatures.length > 0 && signatureFields.length === 0) {
    checkPageBreak(lineHeight * 8);
    yPosition -= lineHeight * 2;

    drawText("EXECUTED SIGNATURES", {
      font: timesRomanBoldFont,
      size: 12,
    });
    yPosition -= lineHeight * 2;

    for (const sig of signatures) {
      checkPageBreak(100);

      // Draw signature image if available
      if (sig.signatureData && sig.signatureData.startsWith("data:image")) {
        try {
          const base64Data = sig.signatureData.split(",")[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          let image;
          if (sig.signatureData.includes("image/png")) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (sig.signatureData.includes("image/jpeg") || sig.signatureData.includes("image/jpg")) {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          if (image) {
            const maxWidth = 150;
            const maxHeight = 60;
            const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
            const width = image.width * scale;
            const height = image.height * scale;

            currentPage.drawImage(image, {
              x: margin,
              y: yPosition - height,
              width,
              height,
            });
            yPosition -= height + 10;
          }
        } catch (imgError) {
          console.error("Error embedding signature image:", imgError);
        }
      }

      // Draw signature line
      currentPage.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: margin + 200, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;

      drawText(sig.signerName, { font: timesRomanBoldFont, size: 10 });
      if (sig.signerRole) {
        drawText(sig.signerRole, { font: timesRomanItalicFont, size: 9 });
      }
      drawText(sig.signerEmail, { size: 9, color: { r: 0.4, g: 0.4, b: 0.4 } });
      drawText(`Signed: ${new Date(sig.signedAt).toLocaleString()}`, {
        size: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
      });
      yPosition -= lineHeight * 2;
    }
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const footerText = `Page ${i + 1} of ${pages.length}`;
    const footerWidth = timesRomanFont.widthOfTextAtSize(footerText, 9);

    page.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: margin / 2,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Add watermark if not signed
    if (!isSigned) {
      page.drawText("DRAFT - NOT EXECUTED", {
        x: pageWidth / 2 - 100,
        y: pageHeight / 2,
        size: 40,
        font: timesRomanBoldFont,
        color: rgb(0.9, 0.9, 0.9),
        rotate: degrees(45),
      });
    }
  }

  return pdfDoc.save();
}

function getJurisdictionLabel(jurisdiction: string): string {
  const labels: Record<string, string> = {
    us_california: "State of California, USA",
    us_texas: "State of Texas, USA",
    us_new_york: "State of New York, USA",
    uk: "England and Wales, United Kingdom",
  };
  return labels[jurisdiction] || jurisdiction;
}
