const PAYING_ROLE_TERMS = [
  "buyer",
  "client",
  "company",
  "customer",
  "employer",
  "hiring party",
  "investor",
  "principal",
  "purchaser",
  "tenant",
];

const NON_PAYING_ROLE_TERMS = [
  "advisor",
  "consultant",
  "contractor",
  "employee",
  "freelancer",
  "seller",
  "service provider",
  "vendor",
];

/**
 * Identify the signer expected to make a contract payment from the role label.
 * Check payee terms first because labels such as "client consultant" must not
 * accidentally be charged. Payment-enabled product flows use these common role
 * names; an unknown/custom role fails closed instead of billing the wrong party.
 */
export function isPayingSignerRole(role: string | null | undefined): boolean {
  const normalizedRole = role?.trim().toLowerCase() || "";
  if (!normalizedRole) return false;
  if (NON_PAYING_ROLE_TERMS.some((term) => normalizedRole.includes(term))) {
    return false;
  }
  return PAYING_ROLE_TERMS.some((term) => normalizedRole.includes(term));
}
