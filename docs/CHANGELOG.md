# Changelog

## 1.3.0 — 2026-11-04 — Redesign, motion, visual pipeline, SDK 58

### Fixed
- **"Project is incompatible with this version of Expo Go"** — upgraded the app to **Expo SDK 58** (React Native 0.88, React 19.3, Jest 30, gesture-handler 3, screens 4.30, safe-area 5.11, svg 15.16); fixed the 19 type errors this caused (RN 0.88 removed `StatusBar.backgroundColor`; list slots no longer accept `null`). Per-screen status bars that forced dark text (wrong in dark mode) were removed — the theme controls it.
- Backend: an old unique `token` index on refresh tokens (databases never migrated) made **every sign-in after the first fail with 409**. The server now drops it on start.
- Backend: a failed sign-up left the new user/company behind (`return` without `await` skipped the rollback). Now fully rolled back; regression-tested.
- Web: gradient headers rendered blank when two screens were mounted (shared SVG ids) — ids are now unique per instance.
- Phone layout: the sign-in card was clipped under the gradient.
- New records did not appear after returning from a form — lists now refresh on focus.

### Added
- **Motion & graphics kit** (`src/components/motion`, `charts`, `graphics`): fade/slide-in with stagger, press-scale feedback, count-up numbers, skeleton loaders, floating gradient hero header, pop-in FAB; animated bar, donut, funnel charts and sparklines. All honour the OS "reduce motion" setting.
- **Form kit** (`src/components/form`, `src/hooks/useForm.ts`): gradient header, completion bar, animated sections, sticky action bar, icon inputs with focus animation, choice chips, searchable picker sheets, quick-date + exact date/time, money fields, steppers, server-error mapping.
- **Client role rules** (`src/utils/permissions.ts`, mirrors the server) — forms only offer what the role may do (e.g. reps see "assigned to you", managers get an assignee picker; EMPLOYEE gets no create buttons). The server still enforces everything.
- New / redesigned forms: **Login, Register (2 steps + live password strength), Forgot/Reset password, Lead (new — there was no create-lead screen), Deal (live win-probability & weighted value), Task/activity, Customer (GSTIN format check, owner picker), Product, Invoice (product picker per line, GST slabs, live animated total), Payment (balance due + "pay full"), Calendar event (durations)**. Duplicate e-mail/phone → "Save anyway?" prompt on leads and customers.
- **Alerts** screen rebuilt: grouped by day, colour-coded types, unread filter, mark-all-read, tap opens the related record when the role can.
- **Pipeline** (replaces the old deals board): KPIs (weighted forecast, won, win rate, overdue), stage-value bar, swipeable kanban + list view with stage filters, move-any-stage sheet, edit.
- **Analytics**: KPIs, deals-by-stage donut, lead funnel, monthly deal value, tasks donut; for Owner/Admin/Manager also collected revenue, forecast trend, top customers and a leaderboard. Reps only ever see their own data (server scope) and never call report endpoints.
- Profile menu entries for Pipeline and Analytics; floating create buttons on Leads, Pipeline, Invoices and Payments; Tasks, Products and Calendar create through the new forms.

### Removed
- Old 2,000-line deals board, the in-screen create modals for tasks/products/events and their handlers (~3,500 lines in total incl. the Login/Register rewrites).
- "Remember me" (sessions always persist; the toggle did nothing) and the Google buttons (they did nothing — Google sign-in needs an OAuth client, see KNOWN_LIMITATIONS).

### Tests
- Mobile 41 → **59**; backend 96 → **97** (upgrade-safety regression).

## 1.2.0 — 2026-11-03 — Team-scoped reports

### Security
- **`/ai/next-best-actions` leaked colleagues' records**: any role (incl. SALES and EMPLOYEE) received company-wide stale lead names, overdue invoice numbers and top-scored leads. It now only uses records in the caller's scope.

### Changed
- Reports (`/reports/sales`, `/leads`, `/deals`, `/top-customers`) and AI (`/ai/lead-scores`, `/sales-forecast`, `/customer-insights`) are team-scoped for managers who lead teams; unchanged for OWNER/ADMIN and teamless managers.
- `/dashboard/manager-summary` now aggregates the manager's team members (it previously counted only the manager's own records despite its `teamLeads` naming) and returns `teamSize`. Teamless managers keep their own figures.
- Top-customers and customer-insights name lookups are now also filtered by company.

### Tests
- Backend 86 → **96**.

## 1.1.0 — 2026-11-03 — CRM workflows

### Added
- **Teams & territories** — `Team` model and `/teams` API (OWNER/ADMIN manage, everyone reads). Managers who lead teams now see only their members' leads, deals, customers, invoices, payments and calendar edits. Mobile **Teams** screen (Profile → Teams & territories).
- **Customer ownership & sharing** — `ownerId` + `sharedWithIds` on customers; SALES/EMPLOYEE see only their own or shared customers; reps can't hand customers to others; admins/managers can reassign. Invoices and payments follow customer visibility.
- **Lead conversion** — `POST /leads/:id/convert` creates (or links) the customer and an optional deal owned by the lead's assignee, marks the lead CONVERTED, records a NOTE activity and an audit entry, and rolls back on failure. Mobile: "Convert to customer" card on the lead screen; choosing *Converted* in the pipeline now runs the real conversion.
- **Duplicate detection** — e-mail (case-insensitive) and phone (last 10 digits) across leads **and** customers; 409 with matches on create/update, `allowDuplicate` override, `GET /leads|customers/duplicates`; colleagues' records reported without names. Mobile customer form offers "Save anyway".
- **CSV import/export** for leads and customers — validated, row-level error report, dry run, duplicate skipping (DB and within the file), owner/assignee by e-mail, formula-injection-safe export with BOM, role-gated and audit-logged.
- **Forgot / reset password screens** in the app (the login link was a no-op) with `crmmobile://reset-password?token=` deep link.
- Migration additions: customer owner backfill, phone digits, lower-case lead e-mails, new indexes.

### Fixed
- **Customers had no `id` in API responses** (`.lean()` skipped the JSON transform) — list items and the detail endpoint now return `id`.
- Lead e-mails are now stored lower-case so duplicates and imports match reliably.

### Tests
- Backend 56 → **86**; mobile 32 → **41**.

## 1.0.0 — 2026-11-03

### Added — themes & company branding
- Company branding on the `Company` model: display name, logo URL, theme preset, primary/accent colours, corner style, density, default colour mode, **theme per role**, allow-personal-themes switch; plus unique **company code**, time zone, locale, currency.
- Personal appearance on `User.preferences`: colour mode and own preset.
- `company` API module: `GET/PATCH /company/branding`, `PATCH /company/profile`, `PATCH /company/preferences`, public `GET /company/public/:code`. Branding and preferences also returned by `/auth/me`.
- Mobile theme engine: 5 presets × light/dark, contrast-safe custom colours, `ThemeProvider`, `useTheme`, `useThemedStyles`, live `colors`/`spacing`/`radius`, `createThemedStyles`; dark mode / system theme; `app.json` `userInterfaceStyle: automatic`.
- **Theme & Branding** screen (all roles, sections by permission) with live preview, preset picker, colour fields, role themes, reset with confirmation; Profile menu entry.
- Company-code lookup on the sign-in screen with remembered pre-login branding.
- Shared components: `CompanyBrand`, `ScreenState`, `StatusBadge`, `SegmentedControl`; theme-aware `Button` (new `outline` variant), `Card`, `TextField` (hint + accessibility).
- Codemod-based migration of 31 existing files to theme-aware styles (28 style sheets, 5 dashboard palettes, 188 exact-match colours) with no visual change in the Classic theme.

### Security
- Access tokens re-validated against the database on every request (suspension/role change immediate).
- Refresh tokens hashed, rotation with atomic revoke, **reuse detection** (session family revoke), TTL cleanup, `/auth/logout-all`.
- Forgot/reset password with hashed single-use 30-minute tokens.
- Timing-safe login, bcrypt cost 10 → 12, password max length.
- Record ownership for SALES/EMPLOYEE on leads, deals and calendar edits; cross-tenant reference checks; dashboards role-gated.
- Team management hierarchy (ADMIN ↛ ADMIN/OWNER, no self role change/delete), activate/suspend users.
- NoSQL-injection guard, body limits, rate limiting (auth, login per e-mail, API, public lookup), request ids, safe 500s, strict CORS & secret checks in production.
- Audit log for sensitive actions.
- `npm audit fix` (backend), targeted patch updates (mobile: axios 1.21, follow-redirects, shell-quote, js-yaml, navigation deps).

### Fixed
- Mobile TypeScript: all 6 baseline errors — missing `getAdminDashboardSummary`/`AdminDashboardSummary`, `process` typing in `client.ts` (TS 6 no longer auto-includes `@types/node`), two `EmployeeNavigator` screen-prop errors, `DashboardSummary` type mismatch (duplicate definitions merged; `createdBy` can be null).
- Removed 36 `as React.ComponentType<any>` casts by giving all role navigators one shared param list.
- **Every user update failed** ("Password is required") because `passwordHash` is `select:false` — validation now only runs when auth fields change.
- Logout and "remove teammate" did nothing on web (`Alert` buttons unsupported in react-native-web) — cross-platform `confirmAction`.
- Invoice numbers could collide after deleting an invoice.
- Registration left an orphan company if creating the owner failed.
- Hard-coded personal LAN IP as API fallback replaced with emulator/localhost defaults.
- Header text invisible in dark mode on Admin/Sales navigators.
- ESLint: 20 baseline errors (missing RN/browser globals, useless escapes).
- Expo Doctor 18/21 → 21/21: removed obsolete `edgeToEdgeEnabled` and top-level `splash` (now `expo-splash-screen` plugin), added `expo-font` peer, Expo 57.0.26 → 57.0.31.
- Server no longer refuses to start without `GOOGLE_CLIENT_ID` (Google sign-in returns 503 instead).

### Removed
- Unused `expo` dependency from the backend.
- Outdated SDK 54 report removed.

### Ops
- `/api/v1/ready`, graceful shutdown, structured JSON logs in production, `npm run migrate` (idempotent, `--dry`), GitHub Actions CI (backend with MongoDB service, mobile checks, web bundle, gitleaks), `.env.example` for both apps.
- Backend tests (56) and mobile tests (32).

### Upgrade notes
- Run `npm run migrate` after backing up. Existing users are signed out once (legacy plaintext refresh tokens are removed).
- Rotate JWT secrets and database credentials if an old `.env` was ever shared.
