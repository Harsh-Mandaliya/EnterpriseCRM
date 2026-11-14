# Testing

## Commands

```bash
# Backend — needs a MongoDB server (TEST_MONGODB_URI, default mongodb://127.0.0.1:27017)
cd crm-backend-mongo
npm run typecheck
npm test                 # node:test via tsx; each file gets its own crm_test_<random> database, dropped afterwards
npm run build

# Mobile
cd crm-mobile-expo
npm run typecheck
npm run lint
npm test                 # Jest (jest-expo preset) + React Native Testing Library
npx expo-doctor
EXPO_PUBLIC_API_URL=https://api.example.com/api/v1 npx expo export --platform web
```

## Results of the final run (2026-11-03, v1.1, Windows 11, Node 24.19, MongoDB 8.3 local)

| Check | Result |
|---|---|
| Backend `tsc --noEmit` (src + tests + scripts) | ✅ 0 errors |
| Backend tests | ✅ **96 passed, 0 failed** (28 suites) |
| Backend `npm run build` | ✅ |
| Backend leftover test databases | ✅ 0 |
| Mobile `tsc --noEmit` | ✅ 0 errors (baseline: 6) |
| Mobile ESLint | ✅ 0 problems (baseline: 20) |
| Mobile Jest | ✅ **41 passed, 0 failed** (7 suites) |
| Expo Doctor | ✅ 21/21 (baseline: 18/21) |
| Web production bundle (`expo export --platform web`) | ✅ 1.9 MB bundle |
| Manual browser E2E against the built web app + real backend (throw-away DB) | ✅ see below |
| Android / iOS native build | ⏭ not part of the automated checks (see README → Building the APK) |
| Physical device | ⏭ not run |

## What the automated tests cover

### Backend (`crm-backend-mongo/tests`)
- **auth.test.ts** — register (company code, default branding, no hash leak), duplicate e-mail, weak password, generic login error, missing/garbage token, refresh rotation, **reuse detection revokes the family**, logout, logout-all, **password reset single-use + ends sessions**, forgot-password non-enumeration, forged reset token, Google 503 when unconfigured.
- **authorization.test.ts** — cross-company read/update/delete by guessed id (404), cross-company `customerId` / `assignedToId` / invoice customer references (400), lists contain only own company, **SALES sees only own leads**, `?assignedToId=` can't widen scope, SALES can't change a colleague's lead, EMPLOYEE can't create records, dashboard and report role gates, SALES can't manage team, **ADMIN can't create/modify/delete ADMIN**, no promotion to OWNER, no self role change, **suspended user locked out immediately**, **role change applies on next request**, NoSQL operator bodies, object query params, malformed ids, malformed JSON.
- **branding.test.ts** — defaults, OWNER updates preset/colours/logo/name, **no leak between companies**, MANAGER/SALES can't edit branding, invalid colour/preset/http logo/`javascript:` URL/unknown field rejected, **role theme for SALES only**, clearing a role theme, **personal preset + dark mode**, company disabling personal themes, OWNER-only profile, unique company code, public lookup returns presentation fields only, unknown code 404.
- **workflows.test.ts** (v1.1) — team CRUD + validation (manager role, foreign users), **team-manager scope** (sees members' leads, not others'; removing a member revokes access; teamless manager stays company-wide), **customer ownership** (ids returned, other reps get 404 on read/edit/delete, sharing, shared users can't re-share, reps can't hand off, admins can), **invoices/payments follow customer visibility**, **duplicates** (e-mail case-insensitive, phone normalised, 409 + override, colleagues' records anonymised, no cross-company matches), **lead conversion** (customer + deal owned by assignee, attach to existing customer, no double conversion, scope/role/foreign-customer/LOST checks), **CSV** (dry run, row errors with line numbers, quoted fields, duplicates in DB and in file, SALES can't import for others, owner mapping, export role gate, team-scoped export, BOM, formula neutralisation, malformed files).
- **unit.test.ts** — invoice totals & rounding, theme resolution order, ownership filter, role hierarchy, company-code slugs, CSV parser/writer, phone normalisation.

### Mobile (`crm-mobile-expo/src/**/__tests__`)
- **buildTheme** — Classic light equals the original palette; system/light/dark; every preset passes text ≥7:1 and button ≥3:1 contrast (this test found and fixed 4 dark presets that failed); custom colours made readable; key changes; invalid network config falls back safely.
- **themeStore** — live `colors`/`radius`, lazy style rebuild only on theme change, subscriptions.
- **useThemeSettingsForm** — validation, minimal diff updates, preview mirrors server resolution.
- **brandingSlice** — branding from login, cleared on logout, save notice, error message.
- **ThemeSettingsScreen** — OWNER sees company branding + company code; SALES doesn't; locked personal themes message; saving dark mode calls the API and updates state.
- **Common components / API client** — Button accessibility & disabled, ScreenState retry, `getApiErrorMessage`.

## Manual end-to-end run (web build + real API)

Backend started on a throw-away database, web bundle served locally, driven in a browser:

1. Login screen in default Classic theme → entered company code → whole screen switched to the company's Sunset theme and name. ✅
2. Signed in as **SALES** → dashboard in **Emerald** (role theme). ✅
3. Theme & branding as SALES → only "My appearance" shown; picking Dark updated the preview only; Save → whole app dark, same screen, success notice; persisted after reload. ✅
4. Logout (found broken on web: `Alert` buttons don't work in react-native-web → fixed) → personal theme cleared, company pre-login look restored. ✅
5. Signed in as **OWNER** → Sunset; company branding editor → Royal → "Saved for everyone" → app switched to Royal. ✅
6. Browser console: no errors. ✅

The test database was dropped afterwards.

## Not covered
Native builds, real devices, Google OAuth with real credentials, e-mail delivery, load/performance testing, Atlas. Older large screens (dashboards, leads, activities) have no component tests.

## v1.1 additions

**Mobile** (`src/screens/__tests__/workflows.test.tsx`): password-policy helper mirrors the server; duplicate-409 parsing and the "owned by a colleague" wording; `LeadConvertCard` converts with a deal amount, shows the server's 403 message, opens the customer after conversion, hides for LOST leads; `TeamForm` validation, manager/member selection, OWNER never offered as a member.

**Migration** (`npm run migrate` on a seeded legacy database): company code generated, unowned customer got its lead's assignee as owner, phone digits backfilled, lead e-mail lower-cased.

**Manual browser E2E (web build + real API, throw-away DB, dropped afterwards):**
1. Login → "Forgot password?" → `/forgot-password` → request sent message. ✅
2. Dev reset link from the server log opened as `/reset-password?token=…` → token pre-filled → new password saved → "signed out everywhere". ✅
3. Signed in as SALES with the new password → My Leads → lead → "Convert lead" with ₹50,000 → app opened the new customer (contact details copied, note added); database showed the lead CONVERTED and one QUALIFICATION deal of 50,000. ✅
4. Console: only two expected 401s (the app tried to resume the session the password reset had revoked).

Not exercised in the browser: the Teams screen (covered by API + component tests).

## v1.2 additions

**Backend** (`tests/reports.test.ts`, 10 tests): manager dashboard counts only team members' leads/deals/revenue (`teamSize` 2) while a teamless manager sees only their own; lead-conversion, deals, sales and top-customer reports are team-scoped for a team manager and company-wide for the OWNER and a teamless manager; AI lead scores, sales forecast and customer insights exclude out-of-team records; **next-best-actions for a SALES rep no longer reveal colleagues' stale leads or overdue invoices** (regression test for the leak fixed in v1.2).

## v1.3 additions (2026-11-04, Expo SDK 58)

| Check | Result |
|---|---|
| Mobile `tsc` / ESLint | ✅ 0 / 0 (after fixing 19 SDK 58 type errors) |
| Mobile Jest | ✅ **59 passed** (9 suites) |
| Expo Doctor | ✅ 20/20 (SDK 58 runs 20 checks) |
| Web production bundle | ✅ |
| Backend tests | ✅ **97 passed** (new: legacy refresh-token index + sign-up rollback) |

**New mobile tests:** pipeline maths (weighted forecast, win rate, overdue, funnel, monthly buckets, leaderboard), invoice totals equal the server's rounding, client role rules, strict date parsing, compact ₹ formatting, password strength; Lead form shows "assigned to you" for SALES and an assignee picker for MANAGER, validates before calling the API and never sends `assignedToId` for reps; Pipeline shows "New deal" for SALES but not EMPLOYEE; Analytics never calls revenue reports for SALES and shows them for ADMIN.

**Browser E2E (isolated backend on port 4100, throw-away DB, dropped afterwards; 375 px phone viewport):** login card layout (found and fixed clipping), sign-in, dashboard → Pipeline (KPIs verified by hand: weighted ₹4L, win rate 50%), move a deal to Proposal from the sheet, New deal form (empty-submit validation, live 75% / weighted ₹1.5L, saved, list refreshed), Analytics as SALES ("your own pipeline", no revenue section, overdue task shown), New lead with a customer's e-mail → duplicate prompt → saved → list refreshed. Found and fixed: blank gradient headers on stacked screens (web).

## v1.3.1 — two-company end-to-end test (2026-11-12)

Data: `npm run seed:demo` (two companies, all five roles, every module — `docs/DEMO_DATA.md`), created through the real API on the local `crm_db`.

**API verification script — 243 checks, all passing:**
- *Authentication*: all 12 users sign in and get the right role and company; wrong password and unknown e-mail give the same 401; another company's password doesn't work; missing, garbage and tampered tokens → 401; duplicate registration → 409; weak password → 400; refresh rotation, replayed refresh token → 401 and the whole session family revoked; refresh after logout → 401.
- *Record scoping*: each rep sees only their own leads, deals, customers, invoices; colleagues' records → 404; the team manager sees the team (and their own) but not the rep outside the team.
- *Role permissions*: EMPLOYEE can't create leads/customers/invoices; SALES and MANAGER can't create users; ADMIN can't create an ADMIN, edit the OWNER or change their own role; only OWNER/ADMIN edit branding, only OWNER the company profile; all five dashboards and the reports return 200/403 exactly per role.
- *Cross-company isolation*: in both directions and for 10 modules — no record of one company appears in the other's lists; GET/PATCH/DELETE by id → 404; leads/invoices/payments can't reference the other company's customer, user or invoice; duplicate check and top-customer report never show the other company. The database was checked afterwards: nothing was modified.
- *Branding*: Sunset vs Royal per company, public lookup by company code (no ids or e-mails exposed), unknown code 404, personal theme allowed in one company and locked in the other.

**Browser (web build against the same API, 375 px phone viewport):** company-code lookup switches the sign-in screen to the company's look; SALES (Emerald role theme), OWNER (Royal), MANAGER, EMPLOYEE and ADMIN dashboards; leads list and detail, status change, pipeline and analytics. Dashboard, pipeline and analytics figures were recalculated by hand from the seeded data. No horizontal overflow.

Bugs found and fixed: see CHANGELOG 1.3.1 (8 issues). The test server ran with `AUTH_RATE_LIMIT_MAX` and `API_RATE_LIMIT_MAX` raised, because the script makes several hundred requests per minute; the limiter itself is covered by the automated tests.

Not covered: native Android/iOS build on a device, e-mail delivery, Google sign-in.

## v1.4 additions (2026-11-12)

| Check | Result |
|---|---|
| Backend `tsc` / tests | ✅ 0 errors · **117 passed** (new `tests/insights.test.ts`, 15 tests) |
| App `tsc` / ESLint / Jest | ✅ 0 / 0 · **75 passed** (new `upgrade.test.tsx`, 13 tests) |
| Expo Doctor | ✅ 20/20 (after SDK 58 patch updates) |
| Two-company role & isolation script (243 checks) | ✅ 243 passed — tasks and calendar now scoped per role |

**Browser (web build + local API, 375 px):** sign-in in **dark mode** shows the full "EnterpriseCRM" brand (was only "E"); registration steps and company-code preview; invoice list shows customer names (was "Unknown customer"); invoice page maths (150 × ₹950 + 12 % GST = ₹1,59,600) and the generated bill (company + customer GSTIN, amount in words, bank details, balance) rendered and checked; Reports — collected 84.8 % = ₹8,89,190 of ₹10,48,790, ageing, who owes, collectors reconciled by hand; Alerts "Needs attention" with reasons; Calendar month/agenda; Customer page tabs and history; Team activity per person with flags; AI Center briefing and deal probabilities (signals add up as documented). Found and fixed during the walk-through: calendar month wrapping, pipeline/payment donut legends showing raw rupees, action buttons not filling the row, and inconsistent "paid" maths for invoices marked PAID by hand.

Not covered: printing to a physical printer, PDF sharing on a real phone (expo-print / expo-sharing are mocked in Jest; on web the generated document was inspected).

## v1.4.1 additions (2026-11-13)

| Check | Result |
|---|---|
| App tsc / ESLint / Jest | ✅ 0 / 0 · **81 passed** (new `leadsPdf.test.ts`) |
| Backend tests | ✅ 117 passed |
| Expo Doctor | ✅ 20/20 |
| Web PDF download | ✅ "Download bill (PDF)" and "Download full business report (PDF)" produced real files (`INV-0004.pdf`, 281 KB, `%PDF-1.3`; `business-report.pdf`, 2 pages) — captured and opened to check the layout |
| Android bundle with the new file-saving code | ✅ `expo export --platform android` |
| Responsive | ✅ lead list/detail at 320, 375 and 1280 px; reports two-column on desktop; no horizontal overflow |

Not verified on a physical phone: saving to Downloads (Android) and the iOS share sheet. They use expo-print, expo-file-system and expo-sharing; on the first save Android asks you to pick the Downloads folder.

## v1.4.2 additions (2026-11-13)

| Check | Result |
|---|---|
| Backend tests | ✅ **128 passed** (6 company-code sign-in tests added; 2 tests of the removed `ownershipFilter` dropped) |
| App tsc / ESLint / Jest | ✅ 0 / 0 · **86 passed** (new `tasks.test.ts`) |
| Customer search, browser | ✅ typing one key at a time keeps focus; "sur" finds the two Surat customers (address search) |
| Tasks, browser | ✅ completed tasks show who completed them, date and time, and on-time / late |
