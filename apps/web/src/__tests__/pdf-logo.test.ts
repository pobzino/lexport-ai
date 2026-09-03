import { describe, expect, it } from "vitest";
import { isSafePdfLogoUrl } from "@/lib/pdf/logo";

describe("PDF logo URL safety", () => {
  it("accepts secure public asset URLs", () => {
    expect(
      isSafePdfLogoUrl(
        "https://rcyarqbyrzvlehughoyz.supabase.co/storage/v1/object/public/company-assets/user/company-logo?v=1",
      ),
    ).toBe(true);
  });

  it("rejects private, local, and non-web locations", () => {
    expect(isSafePdfLogoUrl("https://127.0.0.1/logo.png")).toBe(false);
    expect(isSafePdfLogoUrl("https://192.168.1.4/logo.png")).toBe(false);
    expect(isSafePdfLogoUrl("file:///etc/passwd")).toBe(false);
  });
});
