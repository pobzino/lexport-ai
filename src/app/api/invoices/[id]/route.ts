import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { Invoice, InvoiceLineItem, InvoiceSettings, Payment } from "@/db/types";
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

// GET - Get invoice details or PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
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

    // Get invoice settings for branding
    const { data: settings } = await supabase
      .from("invoice_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get payment details if linked
    let payment: Payment | null = null;
    if (invoice.payment_id) {
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("id", invoice.payment_id)
        .single();
      payment = paymentData;
    }

    // Return PDF if requested
    if (format === "pdf") {
      const pdfBytes = await generateInvoicePDF(
        invoice,
        contract?.title || "Contract",
        settings,
        payment
      );

      // Use inline for iframe preview, attachment for download
      const download = searchParams.get("download") === "true";
      const disposition = download
        ? `attachment; filename="invoice-${invoice.invoice_number}.pdf"`
        : `inline; filename="invoice-${invoice.invoice_number}.pdf"`;

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": disposition,
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
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update invoice status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!["draft", "sent", "paid", "void"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update invoice
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "paid") {
      updateData.paid_at = new Date().toISOString();
    } else if (status === "sent") {
      updateData.sent_at = new Date().toISOString();
    }

    const { data: invoice, error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate PDF for invoice - styled to match modern HTML preview
async function generateInvoicePDF(
  invoice: Invoice,
  contractTitle: string,
  settings: InvoiceSettings | null,
  payment: Payment | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const lineItems = (invoice.line_items || []) as InvoiceLineItem[];

  // Colors - matching the HTML preview
  const textColor = rgb(0.1, 0.1, 0.1); // slate-900
  const mutedColor = rgb(0.4, 0.4, 0.45); // slate-500
  const lightMuted = rgb(0.6, 0.6, 0.65); // slate-400
  const lightGray = rgb(0.97, 0.97, 0.98); // slate-50
  const borderGray = rgb(0.9, 0.9, 0.92); // slate-200
  const paidGreen = rgb(0.1, 0.7, 0.3);

  let y = height - 50;
  const leftMargin = 50;
  const rightMargin = width - 50;

  // ========== PAID WATERMARK ==========
  if (invoice.status === "paid") {
    page.drawText("PAID", {
      x: width / 2 - 120,
      y: height / 2 - 30,
      size: 100,
      font: boldFont,
      color: rgb(0.1, 0.8, 0.3),
      opacity: 0.12,
      rotate: degrees(-35),
    });
  }

  // ========== HEADER ROW ==========
  // Left side: Logo or placeholder, then "From" section
  let logoDrawn = false;
  if (settings?.company_logo_url) {
    try {
      const logoResponse = await fetch(settings.company_logo_url);
      const logoBytes = await logoResponse.arrayBuffer();
      const logoType = settings.company_logo_url.toLowerCase();

      let logoImage;
      if (logoType.includes('.png')) {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } else if (logoType.includes('.jpg') || logoType.includes('.jpeg')) {
        logoImage = await pdfDoc.embedJpg(logoBytes);
      }

      if (logoImage) {
        const logoDims = logoImage.scale(0.5);
        const maxLogoWidth = 100;
        const maxLogoHeight = 45;
        const scale = Math.min(maxLogoWidth / logoDims.width, maxLogoHeight / logoDims.height, 1);

        page.drawImage(logoImage, {
          x: leftMargin,
          y: y - logoDims.height * scale + 10,
          width: logoDims.width * scale,
          height: logoDims.height * scale,
        });
        logoDrawn = true;
      }
    } catch {
      console.error("Failed to load company logo");
    }
  }

  // Draw placeholder box if no logo
  if (!logoDrawn) {
    page.drawRectangle({
      x: leftMargin,
      y: y - 35,
      width: 45,
      height: 45,
      color: lightGray,
      borderColor: borderGray,
      borderWidth: 1,
    });
  }

  // Right side: "INVOICE" title
  const invoiceTitle = "INVOICE";
  const titleWidth = boldFont.widthOfTextAtSize(invoiceTitle, 28);
  page.drawText(invoiceTitle, {
    x: rightMargin - titleWidth,
    y: y - 5,
    size: 28,
    font: boldFont,
    color: textColor,
  });

  // Invoice number below INVOICE
  const invoiceNumText = invoice.invoice_number;
  const templateWidth = font.widthOfTextAtSize(invoiceNumText, 10);
  page.drawText(invoiceNumText, {
    x: rightMargin - templateWidth,
    y: y - 22,
    size: 10,
    font: font,
    color: mutedColor,
  });

  // ========== FROM SECTION ==========
  y -= 70;
  page.drawText("From", {
    x: leftMargin,
    y,
    size: 8,
    font: font,
    color: lightMuted,
  });
  y -= 14;

  const senderName = settings?.company_name || invoice.sender_name;
  if (senderName) {
    page.drawText(senderName, { x: leftMargin, y, size: 11, font: boldFont, color: textColor });
    y -= 14;
  }
  if (invoice.sender_email) {
    page.drawText(invoice.sender_email, { x: leftMargin, y, size: 10, font: font, color: mutedColor });
    y -= 14;
  }
  if (settings?.company_address) {
    const addressLines = settings.company_address.split("\n");
    for (const line of addressLines) {
      page.drawText(line.trim(), { x: leftMargin, y, size: 10, font: font, color: mutedColor });
      y -= 14;
    }
  }

  // ========== TWO COLUMN SECTION: Bill To + Invoice Details ==========
  y -= 20;
  const colY = y;

  // Left column: Bill To
  page.drawText("Bill To", {
    x: leftMargin,
    y: colY,
    size: 8,
    font: font,
    color: lightMuted,
  });

  let billToY = colY - 16;
  if (invoice.recipient_name) {
    page.drawText(invoice.recipient_name, { x: leftMargin, y: billToY, size: 11, font: boldFont, color: textColor });
    billToY -= 14;
  }
  if (invoice.recipient_email) {
    page.drawText(invoice.recipient_email, { x: leftMargin, y: billToY, size: 10, font: font, color: mutedColor });
    billToY -= 14;
  }

  // Right column: Invoice details box (gray background)
  const boxWidth = 180;
  const boxHeight = 70;
  const boxX = rightMargin - boxWidth;
  const boxY = colY - boxHeight + 10;

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    color: lightGray,
  });

  // Invoice details inside box
  const detailsX = boxX + 12;
  const labelX = detailsX;
  const valueX = boxX + 100;
  let detailY = boxY + boxHeight - 18;

  page.drawText("Invoice Date", { x: labelX, y: detailY, size: 9, font: font, color: mutedColor });
  page.drawText(formatDate(invoice.created_at), { x: valueX, y: detailY, size: 9, font: boldFont, color: textColor });
  detailY -= 16;

  page.drawText("Due Date", { x: labelX, y: detailY, size: 9, font: font, color: mutedColor });
  page.drawText(formatDate(invoice.due_date), { x: valueX, y: detailY, size: 9, font: boldFont, color: textColor });
  detailY -= 16;

  page.drawText("Currency", { x: labelX, y: detailY, size: 9, font: font, color: mutedColor });
  page.drawText(invoice.currency.toUpperCase(), { x: valueX, y: detailY, size: 9, font: boldFont, color: textColor });

  // ========== LINE ITEMS TABLE ==========
  y = boxY - 30;

  // Table border
  const tableX = leftMargin;
  const tableWidth = rightMargin - leftMargin;
  const headerHeight = 30;
  const rowHeight = 28;
  const tableHeight = headerHeight + (lineItems.length * rowHeight);

  // Header background
  page.drawRectangle({
    x: tableX,
    y: y - headerHeight + 5,
    width: tableWidth,
    height: headerHeight,
    color: lightGray,
  });

  // Table border
  page.drawRectangle({
    x: tableX,
    y: y - tableHeight + 5,
    width: tableWidth,
    height: tableHeight,
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Header text
  const headerY = y - 8;
  page.drawText("DESCRIPTION", { x: tableX + 12, y: headerY, size: 8, font: boldFont, color: mutedColor });
  page.drawText("QTY", { x: tableX + 320, y: headerY, size: 8, font: boldFont, color: mutedColor });
  page.drawText("UNIT PRICE", { x: tableX + 380, y: headerY, size: 8, font: boldFont, color: mutedColor });
  page.drawText("AMOUNT", { x: tableX + 470, y: headerY, size: 8, font: boldFont, color: mutedColor });

  // Line items
  let itemY = y - headerHeight - 8;
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const desc = item.description.length > 40 ? item.description.substring(0, 37) + "..." : item.description;

    page.drawText(desc, { x: tableX + 12, y: itemY, size: 10, font: font, color: textColor });
    page.drawText(String(item.quantity), { x: tableX + 320, y: itemY, size: 10, font: font, color: mutedColor });
    page.drawText(formatCurrency(item.unit_price, invoice.currency), { x: tableX + 380, y: itemY, size: 10, font: font, color: mutedColor });
    page.drawText(formatCurrency(item.amount, invoice.currency), { x: tableX + 470, y: itemY, size: 10, font: boldFont, color: textColor });

    // Row divider (except last)
    if (i < lineItems.length - 1) {
      page.drawLine({
        start: { x: tableX, y: itemY - 10 },
        end: { x: tableX + tableWidth, y: itemY - 10 },
        thickness: 0.5,
        color: borderGray,
      });
    }
    itemY -= rowHeight;
  }

  // ========== TOTALS SECTION ==========
  y = y - tableHeight - 20;
  const totalsX = tableX + 340;
  const totalsValueX = tableX + 470;

  // Subtotal
  page.drawText("Subtotal", { x: totalsX, y, size: 10, font: font, color: mutedColor });
  page.drawText(formatCurrency(invoice.subtotal || invoice.amount, invoice.currency), { x: totalsValueX, y, size: 10, font: font, color: textColor });
  y -= 24;

  // Thin divider line between Subtotal and Tax
  page.drawLine({
    start: { x: totalsX - 10, y: y + 12 },
    end: { x: rightMargin, y: y + 12 },
    thickness: 0.5,
    color: borderGray,
  });

  // Tax
  page.drawText("Tax (0%)", { x: totalsX, y, size: 10, font: font, color: mutedColor });
  page.drawText(formatCurrency(invoice.tax_amount || 0, invoice.currency), { x: totalsValueX, y, size: 10, font: font, color: textColor });
  y -= 28;

  // Thick divider line above Total Due
  page.drawLine({
    start: { x: totalsX - 10, y: y + 16 },
    end: { x: rightMargin, y: y + 16 },
    thickness: 2,
    color: textColor,
  });

  // Total Due
  page.drawText("Total Due", { x: totalsX, y, size: 13, font: boldFont, color: textColor });
  page.drawText(formatCurrency(invoice.total || invoice.amount, invoice.currency), { x: totalsValueX, y, size: 13, font: boldFont, color: textColor });

  // Payment info if paid
  if (invoice.status === "paid" && payment) {
    y -= 25;
    page.drawText(`Paid on ${formatDate(invoice.paid_at)}`, { x: totalsX, y, size: 10, font: font, color: paidGreen });
  }

  // ========== NOTES SECTION ==========
  if (invoice.notes) {
    y -= 40;
    page.drawLine({
      start: { x: leftMargin, y: y + 15 },
      end: { x: rightMargin, y: y + 15 },
      thickness: 0.5,
      color: borderGray,
    });

    page.drawText("Notes / Terms", { x: leftMargin, y, size: 8, font: font, color: lightMuted });
    y -= 16;

    // Word wrap notes
    const words = invoice.notes.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      if (testLine.length > 80) {
        page.drawText(line, { x: leftMargin, y, size: 10, font: font, color: mutedColor });
        y -= 14;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: leftMargin, y, size: 10, font: font, color: mutedColor });
    }
  }

  // ========== FOOTER ==========
  const footerY = 35;
  const footerText = "A payment link will be included when you send this invoice";
  const footerWidth = font.widthOfTextAtSize(footerText, 8);

  page.drawLine({
    start: { x: leftMargin, y: footerY + 15 },
    end: { x: rightMargin, y: footerY + 15 },
    thickness: 0.5,
    color: borderGray,
  });

  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: footerY,
    size: 8,
    font: font,
    color: lightMuted,
  });

  return pdfDoc.save();
}
