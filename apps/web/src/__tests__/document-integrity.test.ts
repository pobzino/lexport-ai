import { describe, expect, it } from "vitest";
import {
  documentHashesEqual,
  generateContentHash,
  generateUploadedDocumentHash,
} from "@/lib/document-integrity";

const content = {
  preamble: "This agreement is between Alpha Ltd and Beta Ltd.",
  recitals: "The parties wish to work together.",
  clauses: [
    {
      id: "services",
      title: "Services",
      content: "Alpha will provide design services.",
      order: 1,
    },
    {
      id: "fees",
      title: "Fees",
      content: "Beta will pay GBP 1,000.",
      order: 2,
    },
  ],
  signatureBlock: "Signed by the parties.",
};

describe("document integrity", () => {
  it("includes every nested clause property in the generated document hash", () => {
    const original = generateContentHash(content);

    for (const [property, value] of [
      ["id", "services-v2"],
      ["title", "Revised Services"],
      ["content", "Alpha will provide different services."],
      ["order", 3],
    ] as const) {
      const changed = structuredClone(content);
      Object.assign(changed.clauses[0], { [property]: value });
      expect(generateContentHash(changed)).not.toBe(original);
    }
  });

  it("is stable across insignificant whitespace and input clause order", () => {
    const reordered = structuredClone(content);
    reordered.preamble = "  This agreement is between Alpha Ltd   and Beta Ltd. ";
    reordered.clauses.reverse();

    expect(generateContentHash(reordered)).toBe(generateContentHash(content));
  });

  it("binds uploaded documents to both exact source bytes and field placement", () => {
    const bytes = new TextEncoder().encode("example-pdf-bytes");
    const fields = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        type: "signature",
        signer_role: "Client",
        required: true,
        position_x: 10,
        position_y: 80,
        width: 180,
        height: 50,
        page: 2,
        order: 1,
      },
    ];
    const original = generateUploadedDocumentHash(bytes, "pdf", fields);

    expect(
      generateUploadedDocumentHash(
        new TextEncoder().encode("changed-pdf-bytes"),
        "pdf",
        fields,
      ),
    ).not.toBe(original);
    expect(
      generateUploadedDocumentHash(bytes, "pdf", [
        { ...fields[0], position_y: 81 },
      ]),
    ).not.toBe(original);
  });

  it("compares only valid SHA-256 digests", () => {
    const hash = generateContentHash(content);
    expect(documentHashesEqual(hash, hash.toUpperCase())).toBe(true);
    expect(documentHashesEqual(hash, `${hash.slice(0, 63)}0`)).toBe(false);
    expect(documentHashesEqual(hash, "not-a-hash")).toBe(false);
  });
});
