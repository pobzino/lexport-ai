import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { Invoice, InvoiceLineItem } from "@/db/types";
import QRCode from "qrcode";

// Format currency
function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount / 100);
}

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    // Get portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch invoice and verify recipient email matches
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("recipient_email", session.email)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get contract title
    const { data: contract } = await supabase
      .from("contracts")
      .select("title")
      .eq("id", invoice.contract_id)
      .single();

    // Return PDF if requested
    if (format === "pdf") {
      const pdfBytes = await generateInvoicePDF(
        invoice,
        contract?.title || "Contract"
      );

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      invoice: {
        ...invoice,
        contract_title: contract?.title,
      },
    });
  } catch (error) {
    console.error("Error fetching portal invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate PDF for invoice (simplified version for portal)
async function generateInvoicePDF(
  invoice: Invoice,
  contractTitle: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const lineItems = (invoice.line_items || []) as InvoiceLineItem[];

  // Colors
  const primaryColor = rgb(0.4, 0.2, 0.8);
  const textColor = rgb(0.1, 0.1, 0.1);
  const grayColor = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const paidGreen = rgb(0.1, 0.7, 0.3);

  let y = height - 50;

  // PAID watermark
  if (invoice.status === "paid") {
    page.drawText("PAID", {
      x: width / 2 - 120,
      y: height / 2 - 30,
      size: 100,
      font: boldFont,
      color: rgb(0.1, 0.8, 0.3),
      opacity: 0.15,
      rotate: degrees(-35),
    });
  }

  // Header
  page.drawText("INVOICE", {
    x: 50,
    y,
    size: 28,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText(`Invoice #: ${invoice.invoice_number}`, {
    x: width - 200,
    y: height - 50,
    size: 10,
    font: font,
    color: textColor,
  });

  page.drawText(`Date: ${formatDate(invoice.created_at)}`, {
    x: width - 200,
    y: height - 65,
    size: 10,
    font: font,
    color: textColor,
  });

  if (invoice.due_date && invoice.status !== "paid") {
    page.drawText(`Due: ${formatDate(invoice.due_date)}`, {
      x: width - 200,
      y: height - 80,
      size: 10,
      font: font,
      color: textColor,
    });
  }

  // Status
  const statusColors: Record<string, ReturnType<typeof rgb>> = {
    paid: paidGreen,
    sent: rgb(0.9, 0.6, 0.1),
    draft: rgb(0.5, 0.5, 0.5),
    void: rgb(0.8, 0.2, 0.2),
  };

  y -= 40;
  page.drawText(invoice.status.toUpperCase(), {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: statusColors[invoice.status] || grayColor,
  });

  // From section
  y -= 30;
  page.drawText("FROM", { x: 50, y, size: 10, font: boldFont, color: grayColor });
  y -= 15;
  if (invoice.sender_name) {
    page.drawText(invoice.sender_name, { x: 50, y, size: 11, font: boldFont, color: textColor });
    y -= 14;
  }
  if (invoice.sender_email) {
    page.drawText(invoice.sender_email, { x: 50, y, size: 10, font: font, color: textColor });
    y -= 14;
  }

  // To section
  y -= 20;
  page.drawText("BILL TO", { x: 50, y, size: 10, font: boldFont, color: grayColor });
  y -= 15;
  if (invoice.recipient_name) {
    page.drawText(invoice.recipient_name, { x: 50, y, size: 11, font: boldFont, color: textColor });
    y -= 14;
  }
  if (invoice.recipient_email) {
    page.drawText(invoice.recipient_email, { x: 50, y, size: 10, font: font, color: textColor });
    y -= 14;
  }

  // Contract reference
  y -= 25;
  page.drawText(`Contract: ${contractTitle}`, { x: 50, y, size: 10, font: font, color: grayColor });

  // Line items table
  y -= 35;
  page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 25, color: lightGray });

  page.drawText("Description", { x: 55, y, size: 10, font: boldFont, color: textColor });
  page.drawText("Qty", { x: 350, y, size: 10, font: boldFont, color: textColor });
  page.drawText("Unit Price", { x: 400, y, size: 10, font: boldFont, color: textColor });
  page.drawText("Amount", { x: 500, y, size: 10, font: boldFont, color: textColor });

  y -= 30;
  for (const item of lineItems) {
    const desc = item.description.length > 45 ? item.description.substring(0, 42) + "..." : item.description;
    page.drawText(desc, { x: 55, y, size: 10, font: font, color: textColor });
    page.drawText(String(item.quantity), { x: 350, y, size: 10, font: font, color: textColor });
    page.drawText(formatCurrency(item.unit_price, invoice.currency), { x: 400, y, size: 10, font: font, color: textColor });
    page.drawText(formatCurrency(item.amount, invoice.currency), { x: 500, y, size: 10, font: font, color: textColor });
    y -= 20;
  }

  // Divider
  y -= 10;
  page.drawLine({ start: { x: 350, y }, end: { x: width - 50, y }, thickness: 1, color: lightGray });

  // Totals
  y -= 25;
  page.drawText("Subtotal:", { x: 400, y, size: 10, font: font, color: textColor });
  page.drawText(formatCurrency(invoice.subtotal || invoice.amount, invoice.currency), { x: 500, y, size: 10, font: font, color: textColor });

  if (invoice.tax_amount && invoice.tax_amount > 0) {
    y -= 18;
    page.drawText("Tax:", { x: 400, y, size: 10, font: font, color: textColor });
    page.drawText(formatCurrency(invoice.tax_amount, invoice.currency), { x: 500, y, size: 10, font: font, color: textColor });
  }

  y -= 25;
  page.drawText("Total:", { x: 400, y, size: 12, font: boldFont, color: textColor });
  page.drawText(formatCurrency(invoice.total || invoice.amount, invoice.currency), { x: 500, y, size: 12, font: boldFont, color: primaryColor });

  if (invoice.status === "paid" && invoice.paid_at) {
    y -= 30;
    page.drawText(`Paid on ${formatDate(invoice.paid_at)}`, { x: 400, y, size: 10, font: font, color: paidGreen });
  }

  // QR code for unpaid invoices
  if (invoice.status !== "paid" && invoice.status !== "void") {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
      const paymentUrl = `${baseUrl}/portal/contracts/${invoice.contract_id}?action=pay`;
      const qrDataUrl = await QRCode.toDataURL(paymentUrl, { width: 100, margin: 1 });
      const qrBase64 = qrDataUrl.split(",")[1];
      const qrBytes = Buffer.from(qrBase64, "base64");
      const qrImage = await pdfDoc.embedPng(qrBytes);

      page.drawImage(qrImage, { x: 50, y: 50, width: 70, height: 70 });
      page.drawText("Scan to Pay", { x: 50, y: 38, size: 8, font: boldFont, color: primaryColor });
    } catch {
      // Skip QR code on error
    }
  }

  // Notes
  if (invoice.notes) {
    const notesY = invoice.status !== "paid" ? 150 : y - 40;
    page.drawText("Notes:", { x: 50, y: notesY, size: 10, font: boldFont, color: grayColor });

    let currentY = notesY - 15;
    const words = invoice.notes.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      if (testLine.length > 60) {
        page.drawText(line, { x: 50, y: currentY, size: 10, font: font, color: textColor });
        currentY -= 14;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) page.drawText(line, { x: 50, y: currentY, size: 10, font: font, color: textColor });
  }

  // Footer
  page.drawText("Generated by Lexport", { x: invoice.status !== "paid" ? 150 : 50, y: 30, size: 8, font: font, color: grayColor });

  return pdfDoc.save();
}
