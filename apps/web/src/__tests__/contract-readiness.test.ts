import { describe, expect, it } from "vitest";
import type { ContractContent } from "@/db/types";
import {
  findDuplicateRecipientRoles,
  findRecipientsMissingRequiredSignatures,
  findRequiredSignatureRolesWithoutRecipients,
  findUnresolvedContractPlaceholders,
  shouldCheckContractPlaceholders,
} from "@/lib/contracts/readiness";

function content(overrides: Partial<ContractContent> = {}): ContractContent {
  return {
    preamble: "This agreement is made on 3 September 2026.",
    recitals: "The parties wish to record their agreement.",
    clauses: [],
    signatureBlock: "Signed by the parties.",
    ...overrides,
  };
}

describe("contract readiness", () => {
  it("finds labelled blanks in generated legal text", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        clauses: [
          {
            id: "payment",
            title: "Payment",
            order: 1,
            content:
              "Payment is due within _____[Payment Period in Days]_____ days. Milestone: [Stage 1 Description and Amount].",
          },
        ],
      }),
    );

    expect(unresolved.map(({ text }) => text)).toEqual([
      "_____[Payment Period in Days]_____",
      "[Stage 1 Description and Amount]",
    ]);
  });

  it("finds alternate template markers", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        preamble: "Between {{Client Name}} and <<Supplier Name>>.",
        recitals: "The delivery date is TBD.",
        signatureBlock: "Reference: __________. Notice: [X] days.",
      }),
    );

    expect(unresolved).toHaveLength(3);
  });

  it("does not treat signature and date lines as unresolved template fields", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        signatureBlock:
          "CLIENT\nBy: ____________________\nDate: ____________________\nTitle: _____[Title, if any]_____",
      }),
    );

    expect(unresolved).toEqual([]);
  });

  it("does not flag completed prose or legal citations", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        clauses: [
          {
            id: "law",
            title: "Governing Law",
            order: 1,
            content:
              "The parties refer to Example Ltd v Smith [2024] EWCA Civ 123 and agree payment is due within 14 days.",
          },
        ],
      }),
    );

    expect(unresolved).toEqual([]);
  });

  it("exempts fixed-layout originals but checks reconstructed documents", () => {
    expect(
      shouldCheckContractPlaceholders({
        source_type: "uploaded",
        source_file_type: "pdf",
        processing_mode: "sign_only",
      }),
    ).toBe(false);
    expect(
      shouldCheckContractPlaceholders({
        source_type: "uploaded",
        source_file_type: "pdf",
        processing_mode: "review",
      }),
    ).toBe(false);
    expect(
      shouldCheckContractPlaceholders({
        source_type: "uploaded",
        source_file_type: "docx",
        processing_mode: "review",
      }),
    ).toBe(true);
    expect(
      shouldCheckContractPlaceholders({
        source_type: "uploaded",
        processing_mode: "edit_and_sign",
      }),
    ).toBe(true);
    expect(
      shouldCheckContractPlaceholders({ source_type: "generated" }),
    ).toBe(true);
  });

  it("requires one required signature field for every recipient role", () => {
    const missing = findRecipientsMissingRequiredSignatures(
      [
        { name: "Alex Morgan", role: "Client" },
        { name: "Sam Lee", role: "Supplier" },
        { name: "Roleless Recipient" },
      ],
      [
        { type: "signature", signer_role: " client ", required: true },
        { type: "initials", signer_role: "Supplier", required: true },
        { type: "signature", signer_role: "Supplier", required: false },
      ],
    );

    expect(missing).toEqual(["Supplier", "Roleless Recipient"]);
  });

  it("accepts required signature assignments case-insensitively", () => {
    expect(
      findRecipientsMissingRequiredSignatures(
        [{ role: "Company" }, { role: "Contractor" }],
        [
          { type: "signature", signer_role: "company", required: true },
          { type: "signature", signer_role: "CONTRACTOR" },
        ],
      ),
    ).toEqual([]);
  });

  it("finds prepared signature roles without recipients", () => {
    expect(
      findRequiredSignatureRolesWithoutRecipients(
        [{ role: "Client" }],
        [
          { type: "signature", signer_role: "Client", required: true },
          { type: "signature", signer_role: "Supplier", required: true },
          { type: "date", signer_role: "Witness", required: true },
        ],
      ),
    ).toEqual(["Supplier"]);
  });

  it("finds duplicate recipient roles case-insensitively", () => {
    expect(
      findDuplicateRecipientRoles([
        { role: "Client" },
        { role: " client " },
        { role: "Supplier" },
      ]),
    ).toEqual(["client"]);
  });
});
