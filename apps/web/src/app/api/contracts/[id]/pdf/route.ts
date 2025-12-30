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

    // For Quick mode uploaded contracts, return the original PDF from storage
    if (contract.source_type === "uploaded" && contract.processing_mode === "quick" && contract.source_file_url) {
      let pdfBlob: Blob;

      // Check if source_file_url is a full URL (legacy) or just a path (new format)
      if (contract.source_file_url.startsWith("http")) {
        // Legacy: It's a signed URL - fetch directly
        try {
          const response = await fetch(contract.source_file_url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          pdfBlob = await response.blob();
        } catch (fetchError) {
          console.error("Failed to fetch PDF from signed URL:", fetchError);
          return NextResponse.json(
            { error: "Failed to retrieve original document (signed URL may have expired)" },
            { status: 500 }
          );
        }
      } else {
        // New format: It's a file path - use Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("contract-uploads")
          .download(contract.source_file_url);

        if (downloadError || !fileData) {
          console.error("Failed to download original PDF:", downloadError);
          return NextResponse.json(
            { error: "Failed to retrieve original document" },
            { status: 500 }
          );
        }
        pdfBlob = fileData;
      }

      // Log audit event for PDF download
      const context = getRequestContextFromRequest(request);
      await auditLogger.pdfDownloaded(
        id,
        user.id,
        user.email || null,
        user.user_metadata?.name || user.user_metadata?.full_name || null,
        context
      );

      return new NextResponse(Buffer.from(await pdfBlob.arrayBuffer()), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${sanitizeFilename(contract.title)}.pdf"`,
        },
      });
    }

    // For generated contracts or Full mode uploads, generate PDF from content
    const content = contract.content as ContractContent;
    if (!content || !content.clauses) {
      return NextResponse.json(
        { error: "Contract has no content to generate PDF from" },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBytes = await generateContractPDF(
      contract.title,
      content,
      contract.jurisdiction,
      signatures,
      contract.status === "signed",
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

  // If we have signature fields, use field-based placement (DocuSign style)
  if (signatureFields.length > 0) {
    // DocuSign-style colors
    const yellowBg = rgb(1, 0.95, 0.8); // Light yellow for pending fields
    const yellowBorder = rgb(0.9, 0.75, 0.2); // Amber border
    const signedBg = rgb(0.95, 0.98, 0.95); // Light green for signed
    const signedBorder = rgb(0.4, 0.7, 0.4); // Green border
    const blueText = rgb(0.1, 0.3, 0.6); // Blue for signature text

    // Create a signature block area - calculate height based on fields
    const signatureBlockHeight = 250;
    const signatureBlockWidth = contentWidth;
    const signatureBlockStartY = yPosition;

    // Helper function to get field value
    const getFieldValue = (fieldId: string) => fieldValues.find((fv) => fv.field_id === fieldId);

    // Helper function to get signature record
    const getSignatureRecord = (signatureId: string) => {
      return allSignatures.find((s) => s.id === signatureId);
    };

    // Helper to get signer name by role
    const getSignerByRole = (role: string) => {
      return signatureRequests.find((sr) => sr.signer_role === role);
    };

    // Group fields by signer role for better layout
    const fieldsByRole = signatureFields.reduce((acc, field) => {
      if (!acc[field.signer_role]) acc[field.signer_role] = [];
      acc[field.signer_role].push(field);
      return acc;
    }, {} as Record<string, SignatureField[]>);

    // Calculate column width based on number of signers
    const numSigners = Object.keys(fieldsByRole).length;
    const columnWidth = signatureBlockWidth / Math.max(numSigners, 1);
    let columnIndex = 0;

    for (const [role, fields] of Object.entries(fieldsByRole)) {
      const signer = getSignerByRole(role);
      const columnX = margin + columnIndex * columnWidth;
      let fieldYOffset = 0;

      // Draw role header
      currentPage.drawText(role.toUpperCase(), {
        x: columnX + 10,
        y: signatureBlockStartY - 20,
        size: 9,
        font: timesRomanBoldFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      fieldYOffset = 40;

      for (const field of fields) {
        const fieldX = columnX + 10;
        const fieldY = signatureBlockStartY - fieldYOffset;
        const fieldValue = getFieldValue(field.id);
        const fieldWidth = Math.min(field.width, columnWidth - 30);
        const fieldHeight = field.height;

        if (fieldValue) {
          // Field has been completed - DocuSign signed style
          const sigRecord = fieldValue.signature_id ? getSignatureRecord(fieldValue.signature_id) : null;

          // Draw signed field background
          currentPage.drawRectangle({
            x: fieldX,
            y: fieldY - fieldHeight,
            width: fieldWidth,
            height: fieldHeight,
            color: signedBg,
            borderColor: signedBorder,
            borderWidth: 1,
          });

          if ((field.type === "signature" || field.type === "initials") && sigRecord?.signature_data) {
            const sigData = sigRecord.signature_data;
            if (sigData.startsWith("data:image")) {
              try {
                const base64Data = sigData.split(",")[1];
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                let image;
                if (sigData.includes("image/png")) {
                  image = await pdfDoc.embedPng(imageBytes);
                } else if (sigData.includes("image/jpeg") || sigData.includes("image/jpg")) {
                  image = await pdfDoc.embedJpg(imageBytes);
                }

                if (image) {
                  const maxWidth = fieldWidth - 20;
                  const maxHeight = fieldHeight - 35;
                  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
                  const width = image.width * scale;
                  const height = image.height * scale;

                  // "Signed by:" label
                  currentPage.drawText("Signed by:", {
                    x: fieldX + 5,
                    y: fieldY - 12,
                    size: 7,
                    font: timesRomanFont,
                    color: rgb(0.4, 0.4, 0.4),
                  });

                  // Signer name in blue
                  currentPage.drawText(signer?.signer_name || role, {
                    x: fieldX + 5,
                    y: fieldY - 22,
                    size: 9,
                    font: timesRomanBoldFont,
                    color: blueText,
                  });

                  // Signature image
                  currentPage.drawImage(image, {
                    x: fieldX + 5,
                    y: fieldY - fieldHeight + 20,
                    width,
                    height,
                  });

                  // Verification hash (truncated)
                  if (sigRecord.image_hash) {
                    const shortHash = sigRecord.image_hash.substring(0, 16).toUpperCase() + "...";
                    currentPage.drawText(shortHash, {
                      x: fieldX + 5,
                      y: fieldY - fieldHeight + 8,
                      size: 6,
                      font: timesRomanFont,
                      color: rgb(0.5, 0.5, 0.5),
                    });
                  }
                }
              } catch (imgError) {
                console.error("Error embedding field signature:", imgError);
              }
            }
          } else if (fieldValue.value) {
            // Text or date value
            currentPage.drawText(field.type === "date" ? "Date:" : (field.label || "Value:"), {
              x: fieldX + 5,
              y: fieldY - 12,
              size: 7,
              font: timesRomanFont,
              color: rgb(0.4, 0.4, 0.4),
            });

            currentPage.drawText(fieldValue.value, {
              x: fieldX + 5,
              y: fieldY - 25,
              size: 10,
              font: timesRomanBoldFont,
              color: blueText,
            });
          }
        } else {
          // Field is empty - show single clean signature line (no yellow boxes in PDF)
          currentPage.drawLine({
            start: { x: fieldX, y: fieldY - fieldHeight - 2 },
            end: { x: fieldX + fieldWidth, y: fieldY - fieldHeight - 2 },
            thickness: 0.75,
            color: rgb(0.3, 0.3, 0.3),
          });
        }

        // Field label below
        const labelText = field.label || (field.type.charAt(0).toUpperCase() + field.type.slice(1));
        currentPage.drawText(labelText, {
          x: fieldX,
          y: fieldY - fieldHeight - 14,
          size: 8,
          font: timesRomanItalicFont,
          color: rgb(0.4, 0.4, 0.4),
        });

        fieldYOffset += fieldHeight + 30;
      }

      columnIndex++;
    }

    yPosition = signatureBlockStartY - signatureBlockHeight - lineHeight;
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
