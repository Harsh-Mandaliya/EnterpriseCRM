# Security

## Controls in place (verified by automated tests unless noted)

### Authentication
- **Passwords**: bcrypt, cost 12. Policy 8–128 chars, uppercase + number. Login runs one bcrypt comparison even for unknown e-mails (no timing oracle) and returns the same generic error for wrong e-mail or password.
- **Access tokens**: HS256 JWT, 15 min default. On every request the user is re-loaded from MongoDB — a deleted, suspended, or moved user is rejected immediately, and the current role (not the token's) is used.
- **Refresh tokens**: stored only as SHA-256 hashes; rotated on every use with an atomic revoke (concurrent refreshes can't both win); a replayed old token revokes the whole session family; expired records are removed by a TTL index.
- **Logout** revokes the session; `/auth/logout-all` revokes all of them; suspending a user or resetting a password revokes all of that user's sessions.
- **Password reset**: 32-byte random token, only the hash is stored, 30-minute expiry, single use, previous tokens invalidated, `/forgot-password` never reveals whether an e-mail exists.
- **Google sign-in**: ID token verified on the server (signature, audience = `GOOGLE_CLIENT_ID`, expiry, `email_verified`). Disabled with 503 when not configured.
- **Secrets**: JWT secrets must be ≥32 chars and different from each other (production refuses to start otherwise).
- **Mobile token storage**: `expo-secure-store` (Keychain / Android Keystore). Web build falls back to `localStorage` — see risks.

### Authorization
- Central role groups in `src/utils/permissions.ts`, enforced by `requireRole` on routes.
- Company scoping on every query using the company from the database, never a client value.
- Record scoping for SALES/EMPLOYEE (own) and team managers (team members): leads, deals, customers (owner or shared), invoices and payments (via customer or creator), **tasks and calendar reading (v1.4)**, calendar edits, duplicate checks, CSV exports, reports, work log, alerts and AI insights; out-of-scope ids return 404.
- Work log (`work.*` audit entries) records who created, moved, completed or collected what; no secrets or personal contact data are stored in it.
- Company billing details are returned only to signed-in users of that company, never by the public company lookup.
- Cross-tenant reference checks for `customerId`, `leadId`, `opportunityId`, `assignedToId`, `ownerId`, `attendeeIds`.
- Role hierarchy for team management (ADMIN can't manage ADMIN/OWNER; no self role change or self delete).

### Input & transport hardening
- Zod validation on request bodies; branding schemas are `.strict()` (unknown fields rejected).
- NoSQL-injection guard strips `$`-prefixed and dotted keys and prototype keys from bodies; object-valued query parameters are rejected.
- Body limit 1 MB (JSON) / 100 KB (form); malformed JSON → 400.
- `helmet` security headers, `x-powered-by` disabled, CORS allow-list (wildcard refused in production).
- Rate limits: all `/auth` routes per IP, login & forgot-password per IP+e-mail, whole API per IP, public branding lookup per IP.
- Errors never include stack traces; 500s return a `requestId` that matches the server log.
- Logo URLs must be `https://`; the app also refuses non-https logo URLs from the network.

### Auditing
`AuditLog` collection records: user created/updated (role & active changes)/deleted, branding and company-profile changes, password reset requested/completed. No secrets are written.

### Dependencies
`npm audit --omit=dev` (Nov 2026): backend — no critical; remaining: `zod` 3 (high, fix needs Zod 4 major) and `qs` (moderate, `stringify` path not used). Mobile — remaining highs are in `@expo/cli` tooling (`zod`), not in the app bundle.

## Remaining risks / not verified

| Risk | Impact | Mitigation / next step |
|---|---|---|
| Rate limiter is in-memory | Limits are per process; resets on restart; not shared across instances | Use a Redis store when running more than one instance |
| Web build stores tokens in `localStorage` | XSS on the web origin could steal tokens | Prefer httpOnly cookies for a production web deployment; keep a strict CSP |
| No e-mail provider | Password-reset links are only logged (non-production) | Integrate an e-mail service before enabling self-service reset in production |
| No e-mail verification on registration | Accounts can be registered for addresses the user doesn't own | Add verification flow with the e-mail provider |
| No MFA | Single-factor accounts | Add TOTP for OWNER/ADMIN |
| Unowned legacy customers | Customers the migration could not assign stay visible to OWNER/ADMIN only | Assign owners after migrating |
| CSV export contains contact data | Exported files leave the system | Export is limited to OWNER/ADMIN/MANAGER, scoped, formula-safe and audit-logged |
| Zod 3 advisory GHSA-mrhx-c7xc-m3w5 | Memory exhaustion with huge constrained arrays | Mitigated by the 1 MB body limit; migrate to Zod 4 |
| No file uploads exist | — | When added: size/type validation, malware scan, signed URLs |
| No CSP configured for the web build | — | Configure at the web host |
| Android builds allow plain http (`usesCleartextTraffic`) | Needed for a LAN backend; traffic to an http server can be read on the network | Use an https API URL in production and remove the setting from app.json |
| Secrets in a local `.env` | If the old project ZIP or `.env` was ever shared, the JWT secrets / Google client config / database URI in it must be treated as exposed | **Rotate** `JWT_*` secrets and database credentials; rotating JWT secrets signs everyone out |

## Reporting

Include the `X-Request-Id` from the failing response.
