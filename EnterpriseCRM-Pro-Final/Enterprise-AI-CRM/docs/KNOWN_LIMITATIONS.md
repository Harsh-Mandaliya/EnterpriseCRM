# Known limitations

Honest list of what is **not** done or not verified in this release.

## Not verified in this environment
- **Native Android / iOS builds** (EAS / Gradle / Xcode) — not run. Verified instead: TypeScript, lint, Jest, Expo Doctor (20/20 on SDK 58), and a production **web** bundle exercised end-to-end in a browser (desktop and 375 px phone viewport).
- **Physical device / Expo Go testing** — not performed by me. The SDK 58 upgrade targets the Expo Go version in your screenshot; please confirm on your phone.
- **Google sign-in end to end** — server-side verification is implemented and the not-configured path is tested; a real Google credential flow was not exercised (no client id / device). The app no longer shows Google buttons (they did nothing); adding Google sign-in needs `expo-auth-session` and a Google OAuth client per platform.
- **MongoDB Atlas** — tests ran against local MongoDB 8.3.

## Partially implemented (v1.1)
- **Teams** — team scoping applies to leads, deals, customers, invoices, payments, calendar edits, duplicate checks and exports. Since v1.2 this also covers reports, AI endpoints and the manager dashboard. A manager who leads no team keeps company-wide visibility by design (backward compatible); there is no reporting-line hierarchy beyond one level.
- **Customer ownership** — existing customers get an owner from `npm run migrate` (latest lead/deal assignee). Customers with no linked lead/deal stay unowned and are visible only to OWNER/ADMIN/un-teamed managers until someone assigns an owner. Since v1.3 the customer form has an owner picker for managers/admins; there is still no sharing (sharedWithIds) picker in the app.
- **CSV** — import/export is API-only; there is no upload/download button in the mobile app yet (file picking/sharing needs `expo-document-picker` / `expo-sharing`). Import runs synchronously, max 1,000 rows.
- **Duplicates** — detected on e-mail and phone only (no fuzzy name matching, no merge tool). Lead and customer forms offer "Save anyway" (v1.3).
- **Lead conversion** — no MongoDB transaction (standalone servers lack them); created records are rolled back manually if a later step fails.
- **Password reset** — the app screens and the `crmmobile://reset-password?token=` link work, but **e-mail delivery is not integrated**: the link is only written to the server log outside production.
- On the web build the address bar keeps the last auth path (e.g. `/login`) after signing in; deep links are only configured for the signed-out screens.

## v1.3 redesign — what was not changed
- **Editing**: new forms create records; edit mode exists for leads, deals, customers and products. Tasks keep their existing in-screen edit dialog (OWNER/ADMIN); calendar events and payments have no edit screen.
- **Older large screens** (dashboards, lead/customer detail, activities list, products list, reports) keep their previous layouts — they are themed, and get the new create buttons and refresh, but were not rebuilt with the new kit.
- **No "add task" shortcut on lead or customer pages** — tasks are created from the Tasks screen (the form can link a lead, customer or deal).
- **Date entry** uses quick choices plus typed YYYY-MM-DD / HH:MM (no native calendar picker dependency).
- Pipeline stage changes use a tap sheet (no drag-and-drop).

## Features not implemented (from the requested scope)
- **User invitations by e-mail, e-mail verification, MFA** — users are created by OWNER/ADMIN with an initial password.
- **E-mail delivery** (see above).
- **Push notifications** — in-app notifications only.
- **Bulk actions (beyond CSV import), recurring tasks, deal approvals, lost reasons, forecasting UI beyond the existing AI endpoints.**
- **Invoices**: no PDF generation, credit notes/refunds, payment reconciliation, or GST compliance validation. Tax is a single percentage per invoice. **No legal/tax compliance is claimed.**
- **File uploads** — none exist; company logos are https URLs, not uploaded files.
- **Offline capture & sync** — not implemented; the app requires connectivity.
- **Audit log viewer** — events are recorded in `auditlogs`; there is no UI or API to read them yet.
- **Login history** — only `lastLoginAt` is stored.

## Theming caveats
- Runtime branding does not change the installed app icon, splash or home-screen name.
- Changing the theme re-mounts the navigation tree (navigation state is kept, unsaved input on the visible screen is not).
- A small number of hard-coded colours remain static in older screens (status-badge maps, chart colours). They are readable in light and dark mode but don't follow brand colours.
- Text without an explicit colour uses the platform default (dark) — older screens set colours explicitly, so this was not observed, but new code should always use theme tokens.

## Code-structure follow-ups
Several screens are still 1,500–4,000 lines (e.g. `ActivitiesScreen`, `SalesDashboardScreen`, `LeadDetailScreen`). They were made theme-aware without being split, to avoid risky behavioural changes. New code (settings screen, shared components) follows the smaller-component pattern described in `docs/THEMING.md`.

## Dependencies
- Zod 3 → 4 migration (fixes GHSA-mrhx-c7xc-m3w5) not done: breaking API changes across all validation files.
- Express 4 → 5 not done (not required).
- Upgraded to Expo SDK 58 (React Native 0.88, React 19.3) in v1.3 because current Expo Go only runs SDK 58. Native (EAS) builds on SDK 58 were not run.
- In-memory rate limiter — use Redis or proxy limits for multi-instance deployments.
