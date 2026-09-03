# Lexport ASVS 5.0.0 Level 2 launch review

Reviewed: 2026-09-03

Baseline: https://github.com/OWASP/ASVS/tree/v5.0.0

This is a focused launch review against OWASP ASVS 5.0.0 Level 2. It is not a
claim of full ASVS certification; every Level 2 requirement still needs a
repeatable evidence record and independent penetration testing.

## Controls verified or hardened in this release

| ASVS control | Lexport evidence | Status |
| --- | --- | --- |
| v5.0.0-3.4.1 | Production sends one-year HSTS with `includeSubDomains` and `preload`. | Verified live |
| v5.0.0-3.4.3 | Global CSP has `object-src 'none'`; this release changes `base-uri` to `'none'` and removes production HTTP images. | Implemented; nonce work remains |
| v5.0.0-3.4.6 | Global CSP declares `frame-ancestors 'self'`. | Verified live |
| v5.0.0-3.5.1 | Unsafe browser requests to `/api/*` reject cross-site, opaque, and mismatched origins while allowing non-browser callbacks without browser origin headers. | Implemented and unit tested |
| v5.0.0-6.5.1 | Signer email codes are deleted after successful verification. | Implemented and unit tested |
| v5.0.0-6.5.3 | Signer email codes use Node's cryptographic `randomInt`. | Verified in code |
| v5.0.0-6.5.5 | Signer email codes expire after 10 minutes. | Verified in code |
| v5.0.0-6.6.3 | Verification has a persistent five-attempt cap and 60-second resend cooldown per signature request. | Verified in code |
| v5.0.0-12.3.1 | Plain-HTTP third-party IP geolocation calls were removed; signer IP evidence stays within Lexport. | Implemented |
| v5.0.0-14.2.4 and v5.0.0-16.2.5 | Contract request bodies and complete before/after legal text are no longer copied into application/audit logs. | Implemented |
| v5.0.0-16.4.2 | Browser roles can no longer insert, update, or delete audit evidence; server code now writes with the service role. | Implemented; migration required |
| v5.0.0-16.5.1 | The contract update endpoint no longer returns raw database error messages. | Implemented |

New signer codes are stored as a request-bound HMAC-SHA-256 digest. A temporary
constant-time plaintext comparison keeps already-issued codes usable during the
deployment window; no newly issued code uses plaintext storage.

## Follow-up work

1. Replace CSP `script-src 'unsafe-inline'` with per-response nonces or hashes.
2. Move general-purpose in-memory API limits to a shared durable store before a
   large traffic campaign. Authentication and signer-code controls already have
   provider/database-backed limits, but the generic limiter is instance-local.
3. Record evidence against the remaining ASVS Level 2 controls and commission an
   independent authenticated penetration test before making a compliance claim.
4. Track residual dependency advisories. The remaining critical audit findings
   currently resolve through mobile development/build tooling, not the deployed
   Netlify web runtime; they still need mobile-release remediation.
