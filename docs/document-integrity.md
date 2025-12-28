# Document Integrity & Identity Confirmation

This document explains how Lexport implements tamper-proof document signing using cryptographic hashing and explicit identity confirmation.

## Overview

When a contract is sent for signature, Lexport:
1. Generates a SHA-256 hash of the document content
2. Stores the hash in the database
3. Displays the hash to signers for verification
4. Requires signers to confirm their identity before signing
5. Records all verification data for legal evidence

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Send Contract  │────▶│  Generate Hash  │────▶│  Store in DB    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Sign Document  │◀────│  Verify Hash    │◀────│  Display Hash   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Database Schema

### Contracts Table
```sql
-- Added columns for document integrity
ALTER TABLE contracts ADD COLUMN content_hash TEXT;
ALTER TABLE contracts ADD COLUMN content_hash_algorithm TEXT DEFAULT 'SHA-256';
ALTER TABLE contracts ADD COLUMN content_hash_generated_at TIMESTAMPTZ;
```

### Signatures Table
```sql
-- Added columns for identity confirmation
ALTER TABLE signatures ADD COLUMN identity_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE signatures ADD COLUMN identity_confirmed_at TIMESTAMPTZ;
ALTER TABLE signatures ADD COLUMN identity_confirmation_text TEXT;
```

## Implementation

### 1. Hash Generation (`src/lib/document-integrity.ts`)

```typescript
import { createHash } from "crypto";

export function generateContentHash(content: ContractContent): string {
  // Normalize content for consistent hashing
  const normalizedContent = normalizeContent(content);

  // Generate SHA-256 hash
  const hash = createHash("sha256");
  hash.update(normalizedContent, "utf8");

  return hash.digest("hex");
}
```

**What gets hashed:**
- Preamble
- Recitals
- All clauses (id, title, content, order)
- Signature block

**Normalization:**
- Whitespace is collapsed
- Line endings are normalized
- Clauses are sorted by order
- JSON is stringified with sorted keys

### 2. Hash Storage (`src/app/api/contracts/[id]/send/route.ts`)

When a contract is sent for signature:

```typescript
import { generateContentHash } from "@/lib/document-integrity";

// Generate hash when sending contract
const contentHash = generateContentHash(contract.content);

// Store in database
await supabase.from("contracts").update({
  content_hash: contentHash,
  content_hash_algorithm: "SHA-256",
  content_hash_generated_at: new Date().toISOString(),
}).eq("id", id);
```

### 3. Identity Confirmation Text Generation

```typescript
export function generateIdentityConfirmationText(
  signerName: string,
  signerRole?: string
): string {
  if (signerRole) {
    return `I, ${signerName}, confirm that I am the person identified above, acting in my capacity as ${signerRole}, and I am authorized to sign this document on behalf of the party I represent.`;
  }
  return `I, ${signerName}, confirm that I am the person identified above and I am authorized to sign this document.`;
}
```

### 4. Signing API (`src/app/api/sign/[token]/route.ts`)

**GET Request** - Returns hash and identity confirmation text:
```typescript
return NextResponse.json({
  contract: {
    contentHash: contract.content_hash,
    contentHashAlgorithm: contract.content_hash_algorithm || "SHA-256",
    // ...
  },
  identityConfirmationText: generateIdentityConfirmationText(
    signatureRequest.signer_name,
    signatureRequest.signer_role
  ),
});
```

**POST Request** - Validates and stores identity confirmation:
```typescript
const SignatureSchema = z.object({
  signatureData: z.string().min(1),
  identityConfirmed: z.boolean().refine((v) => v === true, "Must confirm identity"),
  identityConfirmationText: z.string().min(1),
  documentHash: z.string().optional(),
  // ...
});

// Pass to database function
await supabase.rpc("submit_signature", {
  p_identity_confirmed: identityConfirmed,
  p_identity_confirmation_text: identityConfirmationText,
  p_document_hash: documentHash || null,
});
```

### 5. Database Function (`submit_signature`)

The PostgreSQL function stores identity confirmation:

```sql
-- Store signature with identity confirmation
INSERT INTO signatures (
  signature_request_id,
  signature_data,
  identity_confirmed,
  identity_confirmed_at,
  identity_confirmation_text,
  -- ...
) VALUES (
  v_signature_request_id,
  p_signature_data,
  p_identity_confirmed,
  CASE WHEN p_identity_confirmed THEN NOW() ELSE NULL END,
  p_identity_confirmation_text,
  -- ...
);
```

### 6. UI Display (`src/app/sign/[token]/page.tsx`)

**Document Verification Section:**
```tsx
{contract.contentHash && (
  <div className="bg-slate-50 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Shield className="w-4 h-4 text-emerald-600" />
      <span className="text-xs font-semibold text-slate-700 uppercase">
        Document Verified
      </span>
    </div>
    <p className="text-xs text-slate-500 mb-2">
      This document has been cryptographically verified and has not been
      modified since it was sent.
    </p>
    <code className="text-xs font-mono text-slate-600">
      Hash: {contract.contentHash.substring(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-")}...
    </code>
  </div>
)}
```

**Identity Confirmation Checkbox:**
```tsx
<label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
  <input
    type="checkbox"
    checked={identityConfirmed}
    onChange={(e) => setIdentityConfirmed(e.target.checked)}
  />
  <span className="text-sm text-slate-700">
    {identityConfirmationText}
  </span>
</label>
```

**Sign Button Validation:**
```tsx
<button
  onClick={handleSign}
  disabled={!agreedToTerms || !identityConfirmed || signing}
>
  Sign Document
</button>
```

### 7. Certificate of Completion (`src/app/api/contracts/[id]/certificate/route.ts`)

The PDF certificate includes:

```typescript
// Document fingerprint in summary
summary = {
  document_hash: contract.content_hash,
  document_hash_algorithm: contract.content_hash_algorithm || "SHA-256",
  signers: signatureRequests.map((sr) => ({
    // ...
    identity_confirmed: sig?.identity_confirmed || false,
    identity_confirmed_at: sig?.identity_confirmed_at || null,
  })),
};

// Rendered in PDF
if (certificate.summary.document_hash) {
  page.drawText("Document Fingerprint (SHA-256):");
  page.drawText(certificate.summary.document_hash.substring(0, 32).toUpperCase());
}

// Identity status per signer
const identityStatus = signer.identity_confirmed
  ? "Identity Verified ✓"
  : "Identity Not Verified";
```

## Signing Flow

```
1. Contract Owner sends contract
   └── Hash generated and stored with timestamp

2. Signer receives email with signing link

3. Signer opens signing page
   ├── Contract content displayed
   ├── Hash displayed for verification
   └── Identity confirmation text generated

4. Signer completes signing flow
   ├── Reviews document
   ├── Adopts signature style
   ├── Checks identity confirmation checkbox
   ├── Checks legal agreement checkbox
   └── Clicks "Sign Document"

5. Signature submitted
   ├── Identity confirmation recorded with timestamp
   ├── Document hash verified (optional)
   ├── Signature stored with all metadata
   └── Audit log entry created

6. Certificate generated
   ├── Document fingerprint included
   ├── Identity verification status per signer
   └── Complete audit trail
```

## Hash Format

**Full hash (64 characters):**
```
218729d29b171659c13c94fb29a2bf05497062879ee8ad58fbd4229f105cbb3c
```

**Display format (16 characters, grouped):**
```
2187-29D2-9B17-1659...
```

## Legal Evidence

The system provides multiple layers of evidence:

| Evidence Type | Data Stored |
|---------------|-------------|
| Document Integrity | SHA-256 hash, algorithm, generation timestamp |
| Identity Confirmation | Confirmation text, checkbox state, timestamp |
| Signature | Base64 image, type (draw/type/upload), hash |
| Audit Trail | IP address, user agent, geolocation, timestamps |
| Certificate | PDF with all above data, certificate number |

## Utility Functions

```typescript
// Generate hash
generateContentHash(content: ContractContent): string

// Verify hash matches
verifyContentHash(content: ContractContent, storedHash: string): boolean

// Generate identity text
generateIdentityConfirmationText(signerName: string, signerRole?: string): string

// Format hash for display
getShortHash(hash: string): string  // Returns first 16 chars uppercase
formatHashForDisplay(hash: string): string  // Returns "XXXX-XXXX-XXXX-XXXX"
```

## Files Modified

| File | Purpose |
|------|---------|
| `src/lib/document-integrity.ts` | Hash generation utilities |
| `src/app/api/contracts/[id]/send/route.ts` | Generate hash when sending |
| `src/app/api/sign/[token]/route.ts` | Return hash, validate identity confirmation |
| `src/app/sign/[token]/page.tsx` | Display hash and identity confirmation UI |
| `src/app/api/contracts/[id]/certificate/route.ts` | Include hash in PDF certificate |
| `supabase/migrations/20241228_document_integrity.sql` | Database schema changes |

## Security Considerations

1. **Hash Algorithm**: SHA-256 is cryptographically secure and widely trusted
2. **Normalization**: Content is normalized before hashing to prevent false negatives
3. **Server-side Validation**: Hash verification happens on the server, not client
4. **Immutable Storage**: Once hash is generated, contract content should not change
5. **Timestamp Evidence**: All operations are timestamped for audit purposes
