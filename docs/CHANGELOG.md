# Changelog

## 1.4.2 — 2026-11-13 — Customer search, task assignment and completion record

### Fixed
- **Customer search lost the keyboard after one letter**: every keystroke reloaded the list and replaced the whole screen (search box included) with a loading state. The Customers list is rebuilt: the search bar stays mounted and keeps focus, searching waits until typing pauses (300 ms), older results never overwrite newer ones, a small spinner shows while searching, and "Load more" pages through the list. Search now also matches **GSTIN and address/city**. New card design (location, owner, GST tag, one-tap call), responsive grid.
- **Task creation trusted the client**: customer, lead, deal and assignee ids are now checked against the company (cross-company ids → 400), and only Owner / Admin / Manager may assign tasks to someone else (others → 403).

### Added — tasks
- Assign a task to **a specific person** or as a **General (team)** task (`assignedToId: null`) that everyone in the company sees and anyone can pick up and complete.
- **Reassign** from the task list (Owner / Admin / Manager): `PATCH /activities/:id/assign { assignedToId | null }`; the new assignee is notified; completed tasks can't be reassigned.
- **Completion record**: every completed task shows *who* completed it and *when* (date and time) and whether it was **on time or late**; completing asks for confirmation naming you and the time; the task's creator gets a "Task completed" alert with the time. Task responses now include `assignedTo` (name) as well as `completedBy` / `completedAt`.
- Tasks screen rebuilt: open / due-today / overdue / done KPIs; Open · Completed · All; filters Everything · Assigned to me · General (team) · Created by me; search tasks or people; grouped by Overdue / Due today / Upcoming / No date / Completed; "For: …" and "by …" on every card; Assign and Mark done buttons. Task form offers Me / a person / General (team).

### Tests
- Backend 117 → **124** (`tests/tasks.test.ts`: assign to a person with notification, general tasks visible company-wide only, reps can't assign others, cross-company assignee/customer rejected, reassign rules, completion by + time + creator alert, no double completion).
- App 81 → **86** (`tasks.test.ts`: due-date grouping, on-time/late, assignee labels incl. General, filters; address shortening).
- Browser: typed "s", "u", "r" one key at a time in Customers — focus kept, "sur" found both Surat customers; Tasks "Completed" shows "Completed by … · date, time · on time / N days late".

## 1.4.1 — 2026-11-13 — Real PDF downloads, lead screens, responsive layout

### Fixed
- **PDFs did not download.** On web the bill opened in a pop-up *after* loading company details, so browsers blocked it and the app page was printed instead; on phones only a share sheet appeared. Now every PDF (bill, receipt, customer statement, reports, team report, agenda, AI insights) is a real file:
  - **Web:** generated in the browser (html2pdf.js) and downloaded directly as e.g. `INV-0004.pdf` — no pop-up, no print dialog.
  - **Android:** saved into **Downloads** (pick the folder once; it is remembered), then "Share" is offered.
  - **iPhone:** the share sheet opens with the named PDF ("Save to Files", WhatsApp, Mail).
- PDF styles are scoped (`.crm-doc`) so generating a document never restyles the app.
- **Lead screens did not match the rest of the app**: rebuilt the lead list (gradient header, KPIs, search, status chips with counts, cards with owner, source, age and one-tap call) and the lead page (identity card, Call / WhatsApp / E-mail / Task / Deal actions, status tracker, convert card or link to the customer, details, tasks, who-did-what history, delete for managers and above). Status chips were clipped on phones.
- Pipeline deal cards show the owner's name.

### Added
- **Responsive layout**: shared breakpoints (`useResponsive`) and `ResponsiveGrid` — one column on phones, two on tablets, two or three on desktop; KPI tiles four across on wide screens; consistent page gutters (12 px on small phones, 24 px on tablets) and max widths. Applied to leads, reports, team activity, customer, invoice, calendar and AI Center; calendar cells size from the same gutters.

### Tests
- App 75 → **81** (`leadsPdf.test.ts`: lead filtering and search, status tones, breakpoints, PDF file names, scoped CSS for the web export). Backend unchanged (117).
- Browser: the downloaded `INV-0004.pdf` and `business-report.pdf` were captured and opened — valid A4 PDFs (bill on one page, report across two). Lead screens checked at 320, 375 and 1280 px with no horizontal overflow.
- Expo SDK 58 patch update; Expo Doctor 20/20.

## 1.4.0 — 2026-11-12 — Hierarchy everywhere, PDF bills, advanced reports & AI Center

### Added
- **Invoice page** with paid/balance progress, bill preview, payments and history, and **Download bill (PDF)** — a GST tax invoice with both parties' details and GSTINs, line items, GST, total, amount in words (Indian numbering), payments, balance and bank details. **Payment receipt (PDF)** from the invoice page and from every payment in the Payments list. On a phone the share sheet saves or sends the PDF; on web the print dialog offers "Save as PDF".
- **Company billing details** (Owner → Profile → Billing details): legal name, address, GSTIN (validated), phone, e-mail, bank details — printed on every bill and receipt. `PATCH /company/profile { billing }`, returned with branding, never in the public lookup.
- **Customer page** rebuilt: account health, call / WhatsApp / e-mail, quick invoice / deal / task, billed-paid-outstanding KPIs, tabs for deals, billing (invoices + payments), activity (tasks, meetings, history) and **statement PDF**.
- **Calendar** rebuilt: month / week / agenda views, type filters, "mine only", today/week/upcoming/deadline KPIs, event detail sheet (linked customer, lead, deal, attendees, delete when allowed), long-press a date to add, **agenda PDF**.
- **Team activity — who did what**: per-person performance (leads, deals, tasks done/late, invoiced, collected, last active) with red flags for what was not done; day-by-day activity feed with filters; the full history of any deal, lead, customer or invoice. Business actions are now recorded (`work.*` entries): lead created / status / assignment, deal created / stage moves, customer created, invoice created / status, payment recorded, task created / completed, event created. `npm run backfill:worklog` builds history for older records (additive).
- **Reports & Analysis** rebuilt with Overview, Sales, **Money** (billed, collected, outstanding, overdue, ageing buckets, who pays and who owes, payment methods, who collected) and Team tabs; every tab downloads as a PDF. Open to every role, scoped to the user.
- **AI Center** rebuilt: daily briefing, deal win probability with the reasons (+/− signals) and a next step, lead scores with factor bars, customers at risk, revenue trend, next best actions, **insights PDF**. New endpoints `/ai/deal-insights`, `/ai/briefing` (rule-based, scoped).
- **Alerts → Needs attention**: overdue tasks and invoices, deals past their close date, leads untouched for a week and meetings in the next 48 hours, grouped by urgency, each with *why it matters*, opening the record on tap (`GET /notifications/attention`).
- New endpoints: `/reports/team-performance`, `/reports/work-log`, `/reports/receivables`.
- Registration redesigned: labelled steps, company-code preview, "what's included", security note.

### Changed — hierarchy
- **Tasks** follow the hierarchy: Owner/Admin all, team manager their team (assigned to or created by members), Sales/Employee their own; completing a task outside your scope → 404.
- **Calendar**: company events (created by Owner/Admin) are visible to everyone; other events to their creator's hierarchy and to invited attendees.
- Reports, receivables, team activity, alerts and AI insights are available to every role and always limited to that role's scope.
- Invoice list: tapping opens the invoice; "Mark Paid" replaced by **Record payment** (a real payment, so bills, receipts and reports agree). An invoice with status PAID counts as fully paid everywhere.

### Fixed
- **Login brand showed only "E" on phones** (company name drawn in the theme's text colour on an always-light pill — invisible in dark mode). The sign-in/sign-up brand now uses fixed readable colours and never shrinks.
- Registration showed an AI-style ✨ icon; replaced with plain business icons (also on "New" lead status).
- **Every invoice showed "Unknown customer"**: the API returned the customer under `customerId`; it now returns `customer` (with address and GSTIN) and `customerId` as the id.
- Month calendar wrapped after six days on phones.

### Tests
- Backend 102 → **117** (`tests/insights.test.ts`: task and calendar hierarchy, work log incl. cross-company, team performance scoping and flags, receivables maths, needs-attention scoping, billing validation and privacy, deal insights and briefing).
- App 62 → **75** (`upgrade.test.tsx`: amount in words, bill/receipt/report HTML incl. escaping, paid-amount rule, customer statement maths, calendar grid, work-log wording, company-code preview, Reports scoping per role, Alerts grouping and "why it matters").
- Expo SDK 58 patch updates; Expo Doctor 20/20.

## 1.3.1 — 2026-11-12 — Two-company end-to-end test

Found by seeding two realistic companies and testing every role against them (see `docs/DEMO_DATA.md`).

### Fixed
- **Editing or changing the status of any assigned lead failed with 400** — the assignee was read after `populate()`, so the "lead assigned" notification got a user object instead of an id.
- **Admin dashboard showed 0 open deals and ₹0 pipeline** (string company id in an aggregation matched nothing) and **counted converted/unqualified leads as open**.
- **A team manager lost sight of leads and deals they created** without picking an assignee (saved unassigned, but team managers only see their team). They now default to the creator; OWNER/ADMIN can still leave them unassigned.
- **Reps' own tasks never counted as "Pending tasks"** — the task form sends no assignee for SALES/EMPLOYEE and dashboards count by assignee. Tasks without an assignee now belong to their creator; `npm run migrate` backfills old ones.
- App: **Analytics "Tasks & follow-ups" counted the whole company's tasks** for SALES/EMPLOYEE; now only their own, like the rest of "Your own pipeline".
- App: **EMPLOYEE saw "Add customer" and "Add product" buttons** the server rejects with 403 — hidden now.
- App: **double header** on the Leads list and Lead screens for ADMIN, MANAGER and SALES.
- App: owner dashboard card "Today's Visits / Scheduled visits" actually counted activities logged today — relabelled "Today's Activity / Logged today".

### Added
- `npm run seed:demo` — two complete demo companies through the API (`scripts/seed-demo.ts`) and `docs/DEMO_DATA.md` with sign-ins and the expected per-role counts.

### Tests
- Backend 97 → **102**; mobile 59 → **62**.

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
