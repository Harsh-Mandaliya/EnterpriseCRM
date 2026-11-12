# Enterprise AI CRM — Final Report

This report follows the structure requested: problems found, problems fixed (with root cause, file, and verification), features added, database, APIs, testing results, platform verification, and known limitations. Nothing below is fabricated — anywhere a test could not actually be executed in this environment, it is marked `NOT EXECUTED` with the reason, not `PASS`.

---

## A. Existing Problems Found

Found across multiple debugging sessions on the existing project, before this expansion:

1. **`.env` never edited from the placeholder.** `crm-mobile-expo/.env` was byte-for-byte identical to `.env.example` — the mobile app was pointed at a nonexistent IP (`192.168.1.20`), so every API call, including registration, failed to connect.
2. **Stale cross-screen error state.** `LoginScreen` and `RegisterScreen` both read the same `auth.error` from Redux but only cleared it on their own submit — switching screens after a failed attempt on one screen showed a stale error on the other.
3. **Root navigator remount-on-submit bug (the real cause of "redirects to sign-in with no visible error").** `RootNavigator` used one `status` field for both "app is checking for a saved session on boot" and "a login/register request is in flight." Submitting either form set `status = 'loading'`, which triggered `RootNavigator`'s early-return spinner — unmounting the entire navigator (including whatever screen and error message was showing) and remounting a fresh one at the Login screen regardless of whether the request succeeded or failed.
4. **Expo SDK version drift.** Caret ranges (`^54.0.36`) on `expo` and related packages let `npm install` silently pull newer patch versions than the Expo Go client installed on the test device, causing "Project is incompatible" failures.

---

## B. Problems Fixed

### 1. Placeholder `.env` never edited
- **Root cause:** user's `.env` was never changed from `.env.example`'s example IP.
- **Fix:** not a code fix — documented clearly in the README and confirmed via diff against `.env.example`.
- **File:** `crm-mobile-expo/.env` (user-owned, not shipped in the repo)
- **Verification:** confirmed via `diff .env .env.example` showing zero differences before the user corrected it.

### 2. Stale error across Login/Register
- **Root cause:** shared Redux `auth.error`, cleared only on submit, not on screen focus.
- **Fix:** added `useFocusEffect(() => dispatch(clearError()))` to both `LoginScreen` and `RegisterScreen`.
- **Files:** `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/RegisterScreen.tsx`
- **Verification:** TypeScript compiles clean; logic traced manually — `clearError` reducer confirmed to exist and correctly reset `state.error = null`.

### 3. Navigator remount on every submit (root cause of the redirect bug)
- **Root cause:** `status` conflated "app boot check" with "login/register in flight."
- **Fix:** split into two fields — `status` (boot-only) and a new `isSubmitting` (submission-only). `login`/`register` `.pending` reducers now set `isSubmitting = true` instead of `status = 'loading'`, so `RootNavigator`'s boot-spinner condition (`status === 'idle' || status === 'loading'`) is never true during a login/register attempt, and the navigator — and whatever screen/error is showing — stays mounted throughout.
- **Files:** `src/redux/slices/authSlice.ts`, `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/RegisterScreen.tsx` (button spinners switched to read `isSubmitting`)
- **Verification:** TypeScript compiles clean end-to-end; traced every reducer case manually to confirm `status` is now only ever touched by `hydrateSession` and by `login`/`register`/`logout` `.fulfilled` (never `.pending`).

### 4. Expo SDK version drift
- **Root cause:** caret ranges on `expo`, `expo-secure-store`, `expo-status-bar`, `react`, `react-native-safe-area-context`, `react-native-screens` let npm resolve newer versions than Expo SDK 54.0.8 expects.
- **Fix:** removed all caret/tilde ranges on these six packages, pinned to exact versions, regenerated `package-lock.json`.
- **File:** `crm-mobile-expo/package.json`
- **Verification:** confirmed exact versions in the regenerated lockfile.

---

## C. New Features Added (this expansion)

Built for real against the actual database — full model, service, controller, routes on the backend, and API client + at least one working screen on the frontend for each:

| Module | Backend | Frontend |
|---|---|---|
| **Expanded RBAC** | `User.role` extended `OWNER/ADMIN/SALES_REP` → `OWNER/ADMIN/MANAGER/SALES/EMPLOYEE`; new `permissions.ts` capability groups (`CAN_MANAGE_TEAM`, `CAN_MANAGE_BUSINESS_DATA`, `CAN_VIEW_REPORTS`) applied across every route that needs a role check | Role type + `UserManagementScreen` role picker updated to the 4 assignable roles |
| **Products** | `Product` model; full CRUD service/controller/routes | `ProductListScreen` (list + quick-add) |
| **Invoices** | `Invoice` model with embedded line items, auto-generated per-company invoice numbers, server-computed totals, derived `OVERDUE` status (no cron needed); full CRUD + status endpoint | `InvoiceListScreen`, `InvoiceFormScreen` (reached from Customer Detail) |
| **Payments** | `Payment` model; recording a payment actually recomputes the invoice's paid total and flips it to `PAID` when fully covered — not just a log sitting next to the invoice | `PaymentListScreen` |
| **Calendar** | `CalendarEvent` model; CRUD, filterable by date range | `CalendarScreen` (list + quick-add) |
| **Notifications** | `Notification` model; **wired into real triggers**, not a standalone demo collection — lead assignment, task assignment, payment received, and calendar-event attendee all create real notifications | `NotificationListScreen` (mark read / mark all read) |
| **Reports & Analytics** | Real MongoDB aggregations: monthly revenue from paid invoices, lead conversion rate by source, deal win rate & average deal size, top customers by actual paid revenue | `ReportsScreen` (bar chart + stat cards) |
| **AI Center** | Rule-based/statistical analysis over real data — no external LLM call (no API key exists for one) and no hardcoded numbers: weighted lead scoring (contact completeness + this company's actual historical source conversion rate + freshness + engagement), linear-regression sales forecast from real monthly revenue history, next-best-actions from real overdue tasks/invoices/stale leads, at-risk customer detection from real activity gaps | `AiCenterScreen` |

Every new write endpoint is gated by `CAN_MANAGE_BUSINESS_DATA` (blocks `EMPLOYEE` from creating/editing/deleting); Reports and most of AI Center are gated by `CAN_VIEW_REPORTS` (`OWNER`/`ADMIN`/`MANAGER` only).

---

## D. Database

### Collections (12 total)

`companies`, `users`, `refreshtokens`, `customers`, `leads`, `opportunities`, `activities`, `products`, `invoices`, `payments`, `calendarevents`, `notifications`

### Indexes
- `companyId` indexed on every collection (the multi-tenancy mechanism — every query filters by it)
- `email` unique on `users`
- `token` unique on `refreshtokens`
- `(companyId, invoiceNumber)` unique compound index on `invoices` (invoice numbers only need to be unique within a company)
- `status` indexed on `leads`, `opportunities`, `activities`, `invoices`, `payments`, `notifications` (all frequently filtered)
- `startAt` indexed on `calendarevents`

### References
- `User.companyId → Company`
- `Customer/Lead/Opportunity/Activity/Product/Invoice/Payment/CalendarEvent/Notification.companyId → Company`
- `Lead.customerId → Customer`, `Lead.assignedToId → User`
- `Opportunity.leadId → Lead`, `Opportunity.customerId → Customer`, `Opportunity.ownerId → User`
- `Invoice.customerId → Customer`, `Invoice.lineItems[].productId → Product`
- `Payment.invoiceId → Invoice`, `Payment.customerId → Customer`
- `CalendarEvent.customerId/leadId/opportunityId → Customer/Lead/Opportunity`, `attendeeIds[] → User`
- `Notification.userId → User` (recipient)

---

## E. Full API List

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users              (OWNER/ADMIN)
PATCH  /api/v1/users/:id          (OWNER/ADMIN)
DELETE /api/v1/users/:id          (OWNER/ADMIN)

GET    /api/v1/customers
GET    /api/v1/customers/:id
POST   /api/v1/customers          (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/customers/:id      (OWNER/ADMIN/MANAGER/SALES)
DELETE /api/v1/customers/:id      (OWNER/ADMIN/MANAGER/SALES)

GET    /api/v1/leads
GET    /api/v1/leads/:id
POST   /api/v1/leads              (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/leads/:id          (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/leads/:id/status   (OWNER/ADMIN/MANAGER/SALES)
DELETE /api/v1/leads/:id          (OWNER/ADMIN/MANAGER/SALES)

GET    /api/v1/opportunities
GET    /api/v1/opportunities/:id
POST   /api/v1/opportunities          (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/opportunities/:id      (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/opportunities/:id/stage (OWNER/ADMIN/MANAGER/SALES)
DELETE /api/v1/opportunities/:id      (OWNER/ADMIN/MANAGER/SALES)

GET    /api/v1/activities
POST   /api/v1/activities
PATCH  /api/v1/activities/:id
DELETE /api/v1/activities/:id

GET    /api/v1/dashboard

GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products           (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/products/:id       (OWNER/ADMIN/MANAGER/SALES)
DELETE /api/v1/products/:id       (OWNER/ADMIN/MANAGER/SALES)

GET    /api/v1/invoices
GET    /api/v1/invoices/:id
POST   /api/v1/invoices               (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/invoices/:id           (OWNER/ADMIN/MANAGER/SALES)
PATCH  /api/v1/invoices/:id/status    (OWNER/ADMIN/MANAGER/SALES)
DELETE /api/v1/invoices/:id           (OWNER/ADMIN/MANAGER/SALES)

GET    /api/v1/payments
GET    /api/v1/payments/invoice/:invoiceId/summary
POST   /api/v1/payments               (OWNER/ADMIN/MANAGER/SALES)

GET    /api/v1/calendar
POST   /api/v1/calendar
PATCH  /api/v1/calendar/:id
DELETE /api/v1/calendar/:id

GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all

GET    /api/v1/reports/sales           (OWNER/ADMIN/MANAGER)
GET    /api/v1/reports/leads           (OWNER/ADMIN/MANAGER)
GET    /api/v1/reports/deals           (OWNER/ADMIN/MANAGER)
GET    /api/v1/reports/top-customers   (OWNER/ADMIN/MANAGER)

GET    /api/v1/ai/next-best-actions
GET    /api/v1/ai/lead-scores          (OWNER/ADMIN/MANAGER)
GET    /api/v1/ai/sales-forecast       (OWNER/ADMIN/MANAGER)
GET    /api/v1/ai/customer-insights    (OWNER/ADMIN/MANAGER)

GET    /api/v1/health
```

61 direct routes confirmed registered via a structural boot test (see Section F).

---

## F. Testing — actual results

| Test | Result | How verified |
|---|---|---|
| Backend TypeScript compiles | **PASS** | `tsc --noEmit` — 0 errors, both before and after this expansion |
| Frontend TypeScript compiles | **PASS** | `tsc --noEmit` — 0 errors, both before and after this expansion |
| Express app boots, all 14 route modules wire without runtime error | **PASS** | Structural boot test: imported the real `app.ts`, called `app.listen()`, confirmed 61 routes registered, zero exceptions |
| MongoDB connects | **NOT EXECUTED** | This sandbox's network egress blocks MongoDB's install/download servers — no real `mongod` or Atlas cluster reachable from here |
| Register → user actually inserted into MongoDB | **NOT EXECUTED** | Depends on a live database connection (above) |
| Duplicate registration correctly rejected | **NOT EXECUTED** | Same — code path was reviewed manually (checks `User.findOne({ email })` before create and throws `409`), but not run against a live database |
| Login → JWT issued and works on a protected route | **NOT EXECUTED** | Same — logic reviewed manually, not run live |
| Password stored hashed, not plaintext | **Reviewed, not live-verified** | `bcrypt.hash()` confirmed in `hash.ts`; `User.model.ts`'s `toJSON` transform confirmed to strip `passwordHash` from every API response |
| Customers/Leads/Opportunities/Activities/Products/Invoices/Payments/Calendar/Notifications CRUD | **NOT EXECUTED** live; **PASS** structurally | Every route/controller/service reviewed line-by-line; app boots with all routes registered; no live data round-trip performed |
| Android | **NOT EXECUTED** | No Android device/emulator in this sandbox |
| iOS | **NOT EXECUTED** | No iOS device/simulator in this sandbox |
| Web | **NOT EXECUTED** | No browser runtime in this sandbox |
| Expo Go | **NOT EXECUTED** | No physical device/Expo Go client in this sandbox |
| `expo-doctor` | **NOT EXECUTED** | Requires network access to Expo's compatibility registry, which is blocked in this sandbox |
| API error response shape consistent | **PASS (code review)** | Every controller funnels errors through the shared `errorHandler` middleware, confirmed to return `{ error: string }` and never leak stack traces when `NODE_ENV !== 'development'` |
| Security: no secrets in frontend, `.env` excluded from repo | **PASS** | Confirmed `.env` (not `.env.example`) is absent from the delivered zip; no MongoDB URI, JWT secret, or credential appears anywhere in `crm-mobile-expo/` |

**Why so much is `NOT EXECUTED` rather than `PASS`:** this sandbox has no outbound network access to MongoDB's servers, no Android/iOS runtime, and no browser — there's no way to actually run this stack end-to-end here without fabricating results, which was explicitly ruled out. Everything marked `PASS` above was either a real command that actually ran in this sandbox (`tsc`, the structural boot test) or a direct line-by-line code read, not a guess.

---

## G. Platform Verification

```
Android:  NOT EXECUTED — no device/emulator available in this environment
iOS:      NOT EXECUTED — no simulator available in this environment
Web:      NOT EXECUTED — no browser runtime available in this environment
Expo Go:  NOT EXECUTED — no physical device available in this environment
```

All four require you to actually run `npx expo start` (or `--web`) on your own machine, per the README.

---

## H. Known Limitations

Carried over from the original PPT scope (documented there as out of scope, not fixed here) and new limitations introduced by this expansion:

- **No offline mode** — the app requires a live connection to the backend at all times.
- **No push notifications** — the Notifications module is in-app only (poll/pull, not a native push service); there's no APNs/FCM integration.
- **No file/photo attachments** anywhere in the app.
- **No password reset flow** — if a user forgets their password, there is currently no self-service recovery.
- **Invoice creation UI is single-line-item** — the backend supports multiple line items per invoice, but the mobile form currently only builds one-line-item invoices to keep the screen simple. Multi-line-item invoices are fully supported by the API if you build a fuller form or call the endpoint directly.
- **No cron/scheduled jobs** — invoice `OVERDUE` status is computed on read (correct when viewed, but nothing proactively notifies anyone the moment an invoice crosses its due date without someone opening the app).
- **AI Center is rule-based/statistical, not a trained ML model or LLM call** — this was a deliberate choice (no external AI API key exists in this project), and is disclosed directly in the AI Center screen's own UI copy, not hidden.
- **No automated test suite** (Jest/Supertest) — testing in this pass was TypeScript compilation + structural boot verification + manual code review, not unit/integration tests. Adding a real test suite is a reasonable next step but wasn't part of this pass's scope.
