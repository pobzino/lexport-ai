import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { renderLegalContractPdf } from "../src/lib/pdf/legal-contract.ts";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const outputPath = path.join(
  workspaceRoot,
  "output/pdf/proper-legal-document-sample.pdf",
);

function createLogoDataUrl() {
  const canvas = createCanvas(560, 120);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#111111";
  context.lineWidth = 4;
  context.roundRect(4, 4, 126, 108, 14);
  context.stroke();
  context.fillStyle = "#111111";
  context.font = "bold 48px sans-serif";
  context.fillText("LOX", 20, 76);
  context.fillText("Digital", 150, 76);
  return canvas.toDataURL("image/png");
}

function createSignatureDataUrl() {
  const canvas = createCanvas(520, 130);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = "italic 50px serif";
  context.fillText("Alex Morgan", 14, 82);
  context.strokeStyle = "#111111";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(10, 100);
  context.bezierCurveTo(135, 115, 335, 82, 500, 102);
  context.stroke();
  return canvas.toDataURL("image/png");
}

await mkdir(path.dirname(outputPath), { recursive: true });
const pdfBytes = await renderLegalContractPdf({
  title: "Software Services Agreement",
  jurisdiction: "uk",
  identity: {
    companyName: "LOX Digital",
    companyAddress: "31 Pedley Road, RM8 1XE",
    companyLogoUrl: createLogoDataUrl(),
  },
  content: {
    preamble:
      "This agreement is between Example Client Ltd. (the Client) and LOX Digital (the Supplier). It takes effect when both parties have signed it.",
    clauses: [
      {
        title: "1. Services and project",
        content:
          "1.1 The Supplier will design, build and launch the services described in the agreed statement of work using reasonable skill and care.\n1.2 Delivery dates begin after this agreement is signed, the initial payment has cleared and the Client has supplied the required content, access and instructions.\n1.3 A message, meeting or suggestion does not change the scope or price unless both parties confirm the change, cost and timing in writing.",
      },
      {
        title: "2. Fees, review and delivery",
        content:
          "2.1 The Client will pay the fees stated in the agreed proposal against valid invoices.\n2.2 Invoices are due within the stated payment terms and before the relevant phase begins.\n2.3 At each milestone the Supplier will provide a staging link and written checklist. The Client must report any reproducible failure against the agreed scope within three business days.",
      },
      {
        title: "3. Ownership and licence",
        content:
          "3.1 Once all project fees have been paid, the Supplier assigns to the Client the rights in deliverables created specifically for the project.\n3.2 The Supplier retains its pre-existing tools, methods, reusable technology and general know-how. Third-party components remain subject to their own terms.",
      },
      {
        title: "4. Confidentiality and data",
        content:
          "4.1 Each party will protect the other's non-public business, technical and financial information and use it only for this project.\n4.2 Each party will comply with applicable data-protection law and maintain appropriate technical and organisational safeguards.",
      },
      {
        title: "5. Termination and liability",
        content:
          "5.1 Either party may terminate for a material breach not corrected within ten business days after written notice.\n5.2 Neither party excludes liability that cannot legally be excluded. Subject to that limitation, each party's aggregate liability is limited to the total fees paid under this agreement.",
      },
      {
        title: "6. General terms",
        content:
          "6.1 Neither party may bind the other. Any variation must be agreed in writing.\n6.2 This agreement is governed by the law of England and Wales. The courts of England and Wales have exclusive jurisdiction.\n6.3 Counterparts and electronic signatures are valid.",
      },
    ],
  },
  signatureRequests: [
    {
      id: "request-client",
      signer_name: "Alex Morgan",
      signer_email: "alex@example.com",
      signer_role: "Client",
      status: "signed",
      signed_at: "2026-09-02T14:32:00.000Z",
    },
    {
      id: "request-supplier",
      signer_name: "Ogheneakpobor Eruesegbefe",
      signer_email: "pobor@loxdigital.com",
      signer_role: "LOX Digital",
      status: "pending",
    },
  ],
  signatures: [
    {
      signatureRequestId: "request-client",
      signerName: "Alex Morgan",
      signerEmail: "alex@example.com",
      signerRole: "Client",
      signatureData: createSignatureDataUrl(),
      signedAt: "2026-09-02T14:32:00.000Z",
    },
  ],
  isSigned: true,
});

await writeFile(outputPath, pdfBytes);
console.log(outputPath);
