import { createHmac, timingSafeEqual } from "crypto";

const HASH_PREFIX = "hmac-sha256:";
const MINIMUM_SECRET_LENGTH = 32;
const DEVELOPMENT_SECRET = "lexport-local-verification-code-secret";

function getVerificationCodeSecret(): string {
  const secret = process.env.SIGNER_VERIFICATION_SECRET;

  if (secret && secret.length >= MINIMUM_SECRET_LENGTH) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return secret || DEVELOPMENT_SECRET;
  }

  throw new Error(
    `SIGNER_VERIFICATION_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters`
  );
}
function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Store signer codes as a keyed digest so a database or log disclosure does not
 * reveal the six-digit code or allow a cheap offline lookup table attack.
 */
export function hashVerificationCode(
  signatureRequestId: string,
  code: string,
  secret = getVerificationCodeSecret()
): string {
  const digest = createHmac("sha256", secret)
    .update(`${signatureRequestId}:${code}`, "utf8")
    .digest("hex");

  return `${HASH_PREFIX}${digest}`;
}

/**
 * The plaintext branch is temporary rollout compatibility for codes issued
 * before keyed hashing was deployed. All newly issued codes use the HMAC form.
 */
export function matchesVerificationCode(
  storedCode: string,
  signatureRequestId: string,
  suppliedCode: string,
  secret = getVerificationCodeSecret()
): boolean {
  if (!storedCode.startsWith(HASH_PREFIX)) {
    return constantTimeEqual(storedCode, suppliedCode);
  }

  return constantTimeEqual(
    storedCode,
    hashVerificationCode(signatureRequestId, suppliedCode, secret)
  );
}
