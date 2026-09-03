import { describe, expect, it } from "vitest";
import {
  hashVerificationCode,
  matchesVerificationCode,
} from "@/lib/auth/verification-code";

const SECRET = "test-verification-secret-that-is-long-enough";
const REQUEST_ID = "9a66194c-69e0-4a50-82aa-e941979fde03";

describe("signer verification code protection", () => {
  it("stores a keyed digest rather than the six-digit code", () => {
    const stored = hashVerificationCode(REQUEST_ID, "123456", SECRET);

    expect(stored).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);
    expect(stored).not.toContain("123456");
  });

  it("matches only the correct request and code", () => {
    const stored = hashVerificationCode(REQUEST_ID, "123456", SECRET);

    expect(matchesVerificationCode(stored, REQUEST_ID, "123456", SECRET)).toBe(true);
    expect(matchesVerificationCode(stored, REQUEST_ID, "654321", SECRET)).toBe(false);
    expect(matchesVerificationCode(stored, "another-request", "123456", SECRET)).toBe(false);
  });

  it("accepts a pre-deployment plaintext code during the rollout window", () => {
    expect(matchesVerificationCode("123456", REQUEST_ID, "123456", SECRET)).toBe(true);
    expect(matchesVerificationCode("123456", REQUEST_ID, "000000", SECRET)).toBe(false);
  });
});
