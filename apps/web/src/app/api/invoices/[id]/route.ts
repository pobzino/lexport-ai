import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import {
  getBankDetailRows,
  readInvoiceSenderSnapshot,
  type InvoiceBankDetails,
} from "@/lib/invoices/bank-details";
import { PUBLIC_INVOICE_STATUSES } from "@/lib/invoices/payment-link";
import { loadPdfLogo } from "@/lib/pdf/logo";
import {
  ensureNextContractPaymentInvoice,
  syncContractPaymentStatus,
} from "@/lib/invoices/contract-payment-invoice";

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

export interface Invoice {
  id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  recipient_address?: string | null;
  sender_name: string | null;
  sender_company: string | null;
  sender_email: string | null;
  sender_logo_url?: string | null;
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
  bank_details?: InvoiceBankDetails | null;
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
  let page = pdfDoc.addPage([612, 792]); // Letter size

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadPdfLogo(pdfDoc, invoice.sender_logo_url);

  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  const primaryColor = rgb(0.125, 0.18, 0.275); // #202e46
  const accentColor = rgb(0.32, 0.62, 0.78); // #529ec6
  const grayColor = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);

  if (logo) {
    const scale = Math.min(140 / logo.width, 42 / logo.height, 1);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    page.drawImage(logo, {
      x: margin,
      y: yPosition - logoHeight + 4,
      width: logoWidth,
      height: logoHeight,
    });
  }

  // Header - logo/company identity on the left, invoice identity on the right.
  const invoiceTitle = "INVOICE";
  page.drawText(invoiceTitle, {
    x: width - margin - helveticaBoldFont.widthOfTextAtSize(invoiceTitle, 28),
    y: yPosition,
    size: 28,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  // Invoice number and status on right
  const invoiceNumber = invoice.invoice_number;
  const statusText = invoice.status.toUpperCase();

  page.drawText(invoiceNumber, {
    x: width - margin - helveticaBoldFont.widthOfTextAtSize(invoiceNumber, 14),
    y: yPosition - 22,
    size: 14,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  // Status badge
  const statusColor = invoice.status === "paid"
    ? rgb(0.13, 0.55, 0.13) // Green
    : invoice.status === "overdue"
    ? rgb(0.8, 0.2, 0.2) // Red
    : accentColor;

  page.drawText(statusText, {
    x: width - margin - helveticaFont.widthOfTextAtSize(statusText, 10),
    y: yPosition - 40,
    size: 10,
    font: helveticaBoldFont,
    color: statusColor,
  });

  yPosition -= 78;

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

  const senderSnapshot = readInvoiceSenderSnapshot(invoice);
  const senderAddress = senderSnapshot.address || "";
  const senderLines = [
    senderSnapshot.company || invoice.sender_name || "Sender",
    senderSnapshot.company ? invoice.sender_name : null,
    invoice.sender_email,
    senderAddress,
  ].filter((value): value is string => Boolean(value));
  const recipientLines = [
    invoice.recipient_name || "Recipient",
    invoice.recipient_email,
    typeof invoice.recipient_address === "string"
      ? invoice.recipient_address
      : null,
  ].filter((value): value is string => Boolean(value));
  const identityLineCount = Math.max(senderLines.length, recipientLines.length);

  for (let index = 0; index < identityLineCount; index += 1) {
    const senderLine = senderLines[index];
    const recipientLine = recipientLines[index];
    if (senderLine) {
      page.drawText(senderLine.replace(/\s+/g, " ").slice(0, 64), {
        x: margin,
        y: yPosition - index * 14,
        size: index === 0 ? 11 : 9,
        font: index === 0 ? helveticaBoldFont : helveticaFont,
        color: index === 0 ? primaryColor : grayColor,
      });
    }
    if (recipientLine) {
      page.drawText(recipientLine.replace(/\s+/g, " ").slice(0, 64), {
        x: margin + colWidth + margin,
        y: yPosition - index * 14,
        size: index === 0 ? 11 : 9,
        font: index === 0 ? helveticaBoldFont : helveticaFont,
        color: index === 0 ? primaryColor : grayColor,
      });
    }
  }

  yPosition -= identityLineCount * 14 + 26;

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

  const bankDetailRows = getBankDetailRows(
    senderSnapshot.bankDetails,
    invoice.invoice_number
  );
  if (bankDetailRows.length > 0) {
    const estimatedBankLines = bankDetailRows.reduce(
      (totalLines, row) =>
        totalLines + Math.max(1, Math.ceil(`${row.label}: ${row.value}`.length / 85)),
      0
    );
    if (yPosition - estimatedBankLines * 12 < 70) {
      page = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
    }

    page.drawText("BANK TRANSFER DETAILS", {
      x: margin,
      y: yPosition,
      size: 9,
      font: helveticaBoldFont,
      color: grayColor,
    });
    yPosition -= 15;

    for (const row of bankDetailRows) {
      const line = `${row.label}: ${row.value.replace(/\s+/g, " ")}`;
      let remaining = line;
      while (remaining) {
        let part = remaining;
        while (
          helveticaFont.widthOfTextAtSize(part, 9) > width - margin * 2 &&
          part.length > 1
        ) {
          part = part.slice(0, -1);
        }
        page.drawText(part, {
          x: margin,
          y: yPosition,
          size: 9,
          font: helveticaFont,
          color: primaryColor,
        });
        remaining = remaining.slice(part.length).trimStart();
        yPosition -= 12;
      }
    }
    yPosition -= 14;
  }

  // Notes section
  if (invoice.notes) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
    }
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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const download = searchParams.get("download") === "true";
    const isPublic = searchParams.get("public") === "true";
    const sessionSupabase = await createClient();
    const supabase = isPublic ? createAdminClient() : sessionSupabase;

    let userId: string | null = null;
    if (!isPublic) {
      const { data: { user }, error: authError } = await sessionSupabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    let invoiceQuery = supabase
      .from("invoices")
      .select("*")
      .eq("id", id);

    invoiceQuery = isPublic
      ? invoiceQuery.in("status", [...PUBLIC_INVOICE_STATUSES])
      : invoiceQuery.eq("user_id", userId);

    const { data: invoice, error: invoiceError } = await invoiceQuery.single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // If PDF format requested, generate PDF
    if (format === "pdf") {
      const pdfBytes = await generateInvoicePDF(invoice as Invoice);

      const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
      };

      if (download) {
        headers["Content-Disposition"] = `attachment; filename="${invoice.invoice_number}.pdf"`;
      } else {
        headers["Content-Disposition"] = `inline; filename="${invoice.invoice_number}.pdf"`;
      }

      return new NextResponse(Buffer.from(pdfBytes), { headers });
    }

    return NextResponse.json(
      { invoice },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await sessionSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: invoice, error: invoiceError } = await sessionSupabase
      .from("invoices")
      .select(
        "id, user_id, contract_id, payment_id, invoice_number, status, recipient_name, recipient_email, stripe_payment_intent_id"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await request.json();
    const status = body.status;
    if (!['paid', 'cancelled', 'void'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid invoice status" },
        { status: 400 }
      );
    }
    if (invoice.status === "paid" && status !== "paid") {
      return NextResponse.json(
        { error: "A paid invoice cannot be cancelled or voided" },
        { status: 409 }
      );
    }

    const admin = createAdminClient();
    const updatedAt = new Date().toISOString();
    const update: Record<string, unknown> = { status, updated_at: updatedAt };

    if (status === "paid") {
      const suppliedDate =
        typeof body.payment_date === "string"
          ? new Date(`${body.payment_date}T12:00:00.000Z`)
          : new Date();
      update.paid_at = Number.isNaN(suppliedDate.getTime())
        ? updatedAt
        : suppliedDate.toISOString();
      update.payment_method =
        typeof body.payment_method === "string" && body.payment_method.trim()
          ? body.payment_method.trim()
          : "other";
      update.payment_reference =
        typeof body.payment_reference === "string" &&
        body.payment_reference.trim()
          ? body.payment_reference.trim()
          : null;
    }

    const { data: updatedInvoice, error: updateError } = await admin
      .from("invoices")
      .update(update)
      .eq("id", invoice.id)
      .select()
      .single();
    if (updateError || !updatedInvoice) {
      throw updateError || new Error("Failed to update invoice");
    }

    if (invoice.payment_id) {
      if (status === "paid") {
        await admin
          .from("payments")
          .update({
            status: "succeeded",
            payment_method: update.payment_method,
            payer_email: invoice.recipient_email,
            payer_name: invoice.recipient_name,
            updated_at: updatedAt,
          })
          .eq("id", invoice.payment_id)
          .eq("contract_id", invoice.contract_id);

        if (invoice.contract_id) {
          await syncContractPaymentStatus(admin, invoice.contract_id);
          try {
            await ensureNextContractPaymentInvoice({
              supabase: admin,
              contractId: invoice.contract_id,
              recipientName: invoice.recipient_name,
              recipientEmail: invoice.recipient_email,
              baseUrl:
                process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com",
            });
          } catch (nextInvoiceError) {
            console.error(
              `Failed to issue next invoice for contract ${invoice.contract_id}:`,
              nextInvoiceError
            );
          }
        }
      } else {
        await admin
          .from("payments")
          .update({
            status: "failed",
            failure_code: `invoice_${status}`,
            failure_message: `Linked invoice ${invoice.invoice_number} was ${status}`,
            updated_at: updatedAt,
          })
          .eq("id", invoice.payment_id)
          .in("status", ["pending", "processing"]);
      }
    }

    await admin.from("audit_logs").insert({
      contract_id: invoice.contract_id,
      user_id: user.id,
      event_type: status === "paid" ? "invoice_paid" : "invoice_updated",
      actor_email: user.email,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        status,
        payment_method: update.payment_method || null,
        payment_reference: update.payment_reference || null,
        note: typeof body.notes === "string" ? body.notes : null,
      },
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await sessionSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: invoice, error: invoiceError } = await sessionSupabase
      .from("invoices")
      .select("id, status, payment_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (!["draft", "cancelled", "void"].includes(invoice.status)) {
      return NextResponse.json(
        { error: "Only draft, cancelled, or void invoices can be deleted" },
        { status: 409 }
      );
    }

    const admin = createAdminClient();
    if (invoice.payment_id) {
      await admin
        .from("payments")
        .update({
          status: "failed",
          failure_code: "invoice_deleted",
          failure_message: "The linked invoice was deleted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.payment_id)
        .in("status", ["pending", "processing"]);
    }

    const { error: deleteError } = await admin
      .from("invoices")
      .delete()
      .eq("id", invoice.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
