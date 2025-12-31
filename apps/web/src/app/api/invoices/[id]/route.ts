import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface SenderAddress {
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  recipient_address?: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_address?: SenderAddress | null;
  amount: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: string;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  line_items: LineItem[];
  payment_method?: string | null;
  payment_reference?: string | null;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function generateInvoicePDF(invoice: Invoice): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  const primaryColor = rgb(0.125, 0.18, 0.275); // #202e46
  const accentColor = rgb(0.32, 0.62, 0.78); // #529ec6
  const grayColor = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);

  // Header - "INVOICE" title
  page.drawText("INVOICE", {
    x: margin,
    y: yPosition,
    size: 32,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  // Invoice number and status on right
  const invoiceNumber = invoice.invoice_number;
  const statusText = invoice.status.toUpperCase();

  page.drawText(invoiceNumber, {
    x: width - margin - helveticaBoldFont.widthOfTextAtSize(invoiceNumber, 14),
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  yPosition -= 20;

  // Status badge
  const statusColor = invoice.status === "paid"
    ? rgb(0.13, 0.55, 0.13) // Green
    : invoice.status === "overdue"
    ? rgb(0.8, 0.2, 0.2) // Red
    : accentColor;

  page.drawText(statusText, {
    x: width - margin - helveticaFont.widthOfTextAtSize(statusText, 10),
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: statusColor,
  });

  yPosition -= 50;

  // Sender info (left) and Recipient info (right)
  const colWidth = (width - margin * 3) / 2;

  // FROM section
  page.drawText("FROM", {
    x: margin,
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  // TO section
  page.drawText("BILL TO", {
    x: margin + colWidth + margin,
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  yPosition -= 16;

  // Sender name
  if (invoice.sender_name) {
    page.drawText(invoice.sender_name, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helveticaBoldFont,
      color: primaryColor,
    });
  }

  // Recipient name
  page.drawText(invoice.recipient_name || "Recipient", {
    x: margin + colWidth + margin,
    y: yPosition,
    size: 11,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  yPosition -= 14;

  // Sender email
  if (invoice.sender_email) {
    page.drawText(invoice.sender_email, {
      x: margin,
      y: yPosition,
      size: 9,
      font: helveticaFont,
      color: grayColor,
    });
  }

  // Recipient email
  if (invoice.recipient_email) {
    page.drawText(invoice.recipient_email, {
      x: margin + colWidth + margin,
      y: yPosition,
      size: 9,
      font: helveticaFont,
      color: grayColor,
    });
  }

  yPosition -= 14;

  // Sender address
  if (invoice.sender_address) {
    const senderAddr = typeof invoice.sender_address === "string"
      ? invoice.sender_address
      : invoice.sender_address.address || "";
    if (senderAddr) {
      page.drawText(senderAddr, {
        x: margin,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: grayColor,
      });
    }
  }

  // Recipient address
  if (invoice.recipient_address) {
    page.drawText(invoice.recipient_address, {
      x: margin + colWidth + margin,
      y: yPosition,
      size: 9,
      font: helveticaFont,
      color: grayColor,
    });
  }

  yPosition -= 40;

  // Invoice dates section
  page.drawText("INVOICE DATE", {
    x: margin,
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  page.drawText("DUE DATE", {
    x: margin + 150,
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  yPosition -= 14;

  page.drawText(formatDate(invoice.created_at), {
    x: margin,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: primaryColor,
  });

  page.drawText(formatDate(invoice.due_date), {
    x: margin + 150,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: primaryColor,
  });

  yPosition -= 40;

  // Line items table header
  const tableStartY = yPosition;
  const descCol = margin;
  const qtyCol = width - margin - 280;
  const priceCol = width - margin - 190;
  const amountCol = width - margin;

  // Header background
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 5,
    width: width - margin * 2 + 10,
    height: 22,
    color: lightGray,
  });

  page.drawText("Description", {
    x: descCol,
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  page.drawText("Qty", {
    x: qtyCol,
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  const priceHeader = "Price";
  page.drawText(priceHeader, {
    x: priceCol + 80 - helveticaBoldFont.widthOfTextAtSize(priceHeader, 9),
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  const amountHeader = "Amount";
  page.drawText(amountHeader, {
    x: amountCol - helveticaBoldFont.widthOfTextAtSize(amountHeader, 9),
    y: yPosition,
    size: 9,
    font: helveticaBoldFont,
    color: grayColor,
  });

  yPosition -= 25;

  // Line items
  const lineItems = invoice.line_items || [];
  for (const item of lineItems) {
    // Truncate description if too long
    let description = item.description || "Item";
    const maxDescWidth = qtyCol - descCol - 20;
    while (helveticaFont.widthOfTextAtSize(description, 10) > maxDescWidth && description.length > 3) {
      description = description.slice(0, -4) + "...";
    }

    page.drawText(description, {
      x: descCol,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: primaryColor,
    });

    page.drawText(String(item.quantity || 1), {
      x: qtyCol,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: primaryColor,
    });

    // Right-align price
    const priceText = formatCurrency(item.unit_price || 0, invoice.currency);
    page.drawText(priceText, {
      x: priceCol + 80 - helveticaFont.widthOfTextAtSize(priceText, 10),
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: primaryColor,
    });

    // Right-align amount
    const amountText = formatCurrency(item.amount || 0, invoice.currency);
    page.drawText(amountText, {
      x: amountCol - helveticaFont.widthOfTextAtSize(amountText, 10),
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: primaryColor,
    });

    yPosition -= 20;
  }

  // Divider line
  yPosition -= 10;
  const totalsLabelX = width - margin - 150;
  page.drawLine({
    start: { x: totalsLabelX - 10, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 0.5,
    color: grayColor,
  });
  yPosition -= 15;

  // Subtotal
  page.drawText("Subtotal", {
    x: totalsLabelX,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: grayColor,
  });

  const subtotalText = formatCurrency(invoice.subtotal || invoice.amount, invoice.currency);
  page.drawText(subtotalText, {
    x: amountCol - helveticaFont.widthOfTextAtSize(subtotalText, 10),
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: primaryColor,
  });

  yPosition -= 18;

  // Tax (if any)
  if (invoice.tax_amount && invoice.tax_amount > 0) {
    page.drawText("Tax", {
      x: totalsLabelX,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: grayColor,
    });

    const taxText = formatCurrency(invoice.tax_amount, invoice.currency);
    page.drawText(taxText, {
      x: amountCol - helveticaFont.widthOfTextAtSize(taxText, 10),
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: primaryColor,
    });

    yPosition -= 18;
  }

  // Total
  page.drawText("Total", {
    x: totalsLabelX,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  const totalText = formatCurrency(invoice.total || invoice.amount, invoice.currency);
  page.drawText(totalText, {
    x: amountCol - helveticaBoldFont.widthOfTextAtSize(totalText, 12),
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  yPosition -= 50;

  // Notes section
  if (invoice.notes) {
    page.drawText("NOTES", {
      x: margin,
      y: yPosition,
      size: 9,
      font: helveticaBoldFont,
      color: grayColor,
    });

    yPosition -= 14;

    // Word wrap notes
    const words = invoice.notes.split(" ");
    let line = "";
    const maxWidth = width - margin * 2;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (helveticaFont.widthOfTextAtSize(testLine, 9) > maxWidth) {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: 9,
          font: helveticaFont,
          color: grayColor,
        });
        yPosition -= 12;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: grayColor,
      });
    }
  }

  // Footer
  const footerY = 40;
  const footerText = "Generated by Lexport";
  page.drawText(footerText, {
    x: width / 2 - helveticaFont.widthOfTextAtSize(footerText, 8) / 2,
    y: footerY,
    size: 8,
    font: helveticaFont,
    color: grayColor,
  });

  // Paid stamp if paid
  if (invoice.status === "paid") {
    page.drawText("PAID", {
      x: width - margin - 100,
      y: height - 120,
      size: 48,
      font: helveticaBoldFont,
      color: rgb(0.13, 0.55, 0.13),
      opacity: 0.3,
      rotate: degrees(-15),
    });
  }

  return await pdfDoc.save();
}

// GET - Fetch a single invoice by ID or generate PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const download = searchParams.get("download") === "true";

    // Fetch the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // If PDF format requested, generate PDF
    if (format === "pdf") {
      const pdfBytes = await generateInvoicePDF(invoice as Invoice);

      const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
      };

      if (download) {
        headers["Content-Disposition"] = `attachment; filename="${invoice.invoice_number}.pdf"`;
      } else {
        headers["Content-Disposition"] = `inline; filename="${invoice.invoice_number}.pdf"`;
      }

      return new NextResponse(Buffer.from(pdfBytes), { headers });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
