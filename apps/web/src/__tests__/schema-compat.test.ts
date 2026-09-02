import { describe, expect, it } from "vitest";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";

describe("database schema compatibility", () => {
  it("recognises PostgREST read and write errors for one expected column", () => {
    expect(
      isMissingColumnError(
        {
          code: "42703",
          message:
            "column signature_requests.document_hash does not exist",
        },
        "document_hash",
      ),
    ).toBe(true);
    expect(
      isMissingColumnError(
        {
          code: "PGRST204",
          message:
            "Could not find the 'sealed_pdf_path' column of 'contracts' in the schema cache",
        },
        "sealed_pdf_path",
      ),
    ).toBe(true);
  });

  it("does not hide unrelated database failures", () => {
    expect(
      isMissingColumnError(
        { code: "23505", message: "duplicate key value" },
        "document_hash",
      ),
    ).toBe(false);
    expect(
      isMissingColumnError(
        { code: "42703", message: "column another_field does not exist" },
        "document_hash",
      ),
    ).toBe(false);
  });
});
