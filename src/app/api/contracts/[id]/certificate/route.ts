import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { randomBytes } from "crypto";

// Generate Certificate of Completion PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch contract with all related data
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select(`
        *,
        signature_requests (
          id,
          signer_name,
          signer_email,
          signer_role,
          status,
          signed_at,
          viewed_at
        ),
        signatures (
          id,
          signature_request_id,
          ip_address,
          user_agent,
          signed_at,
          image_hash
        ),
        audit_logs (
          id,
          event_type,
          ip_address,
          created_at,
          metadata
        )
      `)
      .eq("id", id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if contract is fully signed
    const signatureRequests = contract.signature_requests as {
      id: string;
      signer_name: string;
      signer_email: string;
      signer_role: string;
      status: string;
      signed_at: string | null;
      viewed_at: string | null;
    }[];

    const allSigned = signatureRequests.every((r) => r.status === "signed");
    if (!allSigned) {
      return NextResponse.json(
        { error: "Contract is not fully signed yet" },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    let certificate = null;
    const { data: existingCert } = await supabase
      .from("completion_certificates")
      .select("*")
      .eq("contract_id", id)
      .single();

    if (existingCert) {
      certificate = existingCert;
    } else {
      // Generate new certificate
      const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;

      const signatures = contract.signatures as {
        id: string;
        signature_request_id: string;
        ip_address: string;
        user_agent: string;
        signed_at: string;
        image_hash: string;
        identity_confirmed: boolean;
        identity_confirmed_at: string | null;
        identity_confirmation_text: string | null;
      }[];

      const auditLogs = contract.audit_logs as {
        id: string;
        event_type: string;
        ip_address: string;
        created_at: string;
        metadata: Record<string, unknown> | null;
      }[];

      // Build summary
      const summary = {
        contract_title: contract.title,
        contract_id: contract.id,
        completed_at: contract.completed_at || contract.signed_at,
        document_hash: contract.content_hash || null,
        document_hash_algorithm: contract.content_hash_algorithm || "SHA-256",
        signers: signatureRequests.map((sr) => {
          const sig = signatures.find((s) => s.signature_request_id === sr.id);
          return {
            name: sr.signer_name,
            email: sr.signer_email,
            role: sr.signer_role || "Signer",
            signed_at: sr.signed_at,
            ip_address: sig?.ip_address || "Unknown",
            signature_hash: sig?.image_hash?.substring(0, 16) || "N/A",
            identity_confirmed: sig?.identity_confirmed || false,
            identity_confirmed_at: sig?.identity_confirmed_at || null,
          };
        }),
        audit_events: auditLogs
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(0, 20) // Limit to 20 events
          .map((log) => ({
            event: log.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            timestamp: log.created_at,
            ip: log.ip_address || "N/A",
          })),
      };

      // Save certificate record
      const { data: newCert, error: insertError } = await supabase
        .from("completion_certificates")
        .insert({
          contract_id: id,
          certificate_number: certificateNumber,
          summary,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating certificate:", insertError);
        return NextResponse.json(
          { error: "Failed to create certificate" },
          { status: 500 }
        );
      }

      certificate = newCert;
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const margin = 50;
    let y = height - margin;

    // Header - Brand color #202e46 = rgb(32, 46, 70) / 255
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width,
      height: 100,
      color: rgb(0.125, 0.18, 0.275),
    });

    page.drawText("CERTIFICATE OF COMPLETION", {
      x: margin,
      y: height - 60,
      size: 24,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("Document Successfully Signed", {
      x: margin,
      y: height - 85,
      size: 12,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });

    y = height - 130;

    // Certificate Number
    page.drawText(`Certificate #: ${certificate.certificate_number}`, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 30;

    // Contract Title
    page.drawText("Document:", {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 15;
    page.drawText(contract.title, {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    // Completion Date
    const completedDate = new Date(certificate.summary.completed_at || new Date());
    page.drawText(`Completed: ${completedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`, {
      x: margin,
      y,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;

    // Document Hash (Tamper Proof)
    if (certificate.summary.document_hash) {
      page.drawText("Document Fingerprint (SHA-256):", {
        x: margin,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 12;
      const shortHash = certificate.summary.document_hash.substring(0, 32).toUpperCase();
      page.drawText(shortHash, {
        x: margin,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 25;
    } else {
      y -= 15;
    }

    // Signers Section
    page.drawText("SIGNERS", {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.125, 0.18, 0.275),
    });
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.125, 0.18, 0.275),
    });
    y -= 20;

    for (const signer of certificate.summary.signers) {
      page.drawText(signer.name, {
        x: margin,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      page.drawText(`(${signer.role})`, {
        x: margin + 150,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 14;

      page.drawText(`Email: ${signer.email}`, {
        x: margin + 10,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 12;

      const signedDate = new Date(signer.signed_at);
      page.drawText(`Signed: ${signedDate.toLocaleString()}  •  IP: ${signer.ip_address}`, {
        x: margin + 10,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 12;

      // Identity confirmation status
      const identityStatus = signer.identity_confirmed ? "Identity Verified ✓" : "Identity Not Verified";
      page.drawText(`${identityStatus}  •  Signature Hash: ${signer.signature_hash}...`, {
        x: margin + 10,
        y,
        size: 8,
        font: helvetica,
        color: signer.identity_confirmed ? rgb(0.1, 0.5, 0.3) : rgb(0.5, 0.5, 0.5),
      });
      y -= 25;
    }

    // Audit Trail Section
    if (y > 200) {
      y -= 20;
      page.drawText("AUDIT TRAIL", {
        x: margin,
        y,
        size: 12,
        font: helveticaBold,
        color: rgb(0.125, 0.18, 0.275),
      });
      y -= 5;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rgb(0.125, 0.18, 0.275),
      });
      y -= 15;

      const eventsToShow = certificate.summary.audit_events.slice(0, 8);
      for (const event of eventsToShow) {
        if (y < 100) break;

        const eventDate = new Date(event.timestamp);
        page.drawText(`${eventDate.toLocaleString()}`, {
          x: margin,
          y,
          size: 8,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawText(event.event, {
          x: margin + 140,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 14;
      }
    }

    // Footer
    page.drawLine({
      start: { x: margin, y: 60 },
      end: { x: width - margin, y: 60 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText("This certificate confirms that all parties have signed the document.", {
      x: margin,
      y: 45,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Generated by Lexport  •  ${new Date().toISOString()}`, {
      x: margin,
      y: 32,
      size: 8,
      font: helvetica,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}
