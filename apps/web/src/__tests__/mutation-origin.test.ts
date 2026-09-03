import { describe, expect, it } from "vitest";
import { isAllowedMutationOrigin } from "@/lib/security";

function request(method: string, headers: HeadersInit = {}) {
  return new Request("https://lexportai.com/api/contracts/contract-id", {
    method,
    headers,
  });
}

describe("mutation origin protection", () => {
  it("allows safe requests", () => {
    expect(
      isAllowedMutationOrigin(
        request("GET", { origin: "https://attacker.example" })
      )
    ).toBe(true);
  });

  it("allows same-origin browser mutations", () => {
    expect(
      isAllowedMutationOrigin(
        request("POST", {
          origin: "https://lexportai.com",
          "sec-fetch-site": "same-origin",
        })
      )
    ).toBe(true);
  });

  it("blocks cross-site and opaque-origin browser mutations", () => {
    expect(
      isAllowedMutationOrigin(
        request("POST", {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        })
      )
    ).toBe(false);
    expect(isAllowedMutationOrigin(request("POST", { origin: "null" }))).toBe(false);
  });

  it("allows server callbacks that do not send browser origin headers", () => {
    expect(isAllowedMutationOrigin(request("POST"))).toBe(true);
  });
});
