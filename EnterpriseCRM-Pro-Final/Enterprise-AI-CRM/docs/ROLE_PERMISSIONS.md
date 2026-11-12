# Role permissions

All checks are enforced by the **backend**. Hiding a button in the app is never the security control. The source of truth is `crm-backend-mongo/src/utils/permissions.ts` (role groups) and `src/utils/scope.ts` (record visibility); this page mirrors them.

Every request is first scoped to the caller's company, which is read from the database for the authenticated user — never from a client-supplied id. Role and active status are re-checked on every request, so suspensions and role changes take effect immediately.

## Record visibility ("scope")

| Role | Sees |
|---|---|
| OWNER, ADMIN | Every record in the company |
| MANAGER **leading ≥1 team** | Records owned by members of the teams they manage, plus their own |
| MANAGER leading no team | Every record in the company (pre-teams behaviour — assign a team to restrict) |
| SALES, EMPLOYEE | Only their own records |

"Owned" means: leads → `assignedToId`; deals → `ownerId`; customers → `ownerId` **or** listed in `sharedWithIds`; invoices → created by a visible user **or** for a visible customer; payments → on a visible invoice; calendar edits → `createdById` (the calendar itself is readable by everyone in the company).

## Matrix

Legend: ✅ allowed · 🔍 within scope (above) · ❌ denied (403, or 404 for records outside scope)

| Resource / action | OWNER | ADMIN | MANAGER | SALES | EMPLOYEE |
|---|:-:|:-:|:-:|:-:|:-:|
| **Leads** list / view / duplicate check | ✅ | ✅ | 🔍 | 🔍 | 🔍 |
| Leads create / edit / status / delete / **convert** | ✅ | ✅ | 🔍 | 🔍 | ❌ |
| **Deals** list / view | ✅ | ✅ | 🔍 | 🔍 | 🔍 |
| Deals create / edit / stage / delete | ✅ | ✅ | 🔍 | 🔍 | ❌ |
| **Customers** list / view / duplicate check | ✅ | ✅ | 🔍 | 🔍 | 🔍 |
| Customers create / edit / delete | ✅ | ✅ | 🔍 | 🔍 ¹ | ❌ |
| Customers reassign owner / change sharing | ✅ | ✅ | 🔍 | own only ¹ | ❌ |
| **CSV export** (leads, customers) | ✅ | ✅ | 🔍 | ❌ | ❌ |
| **CSV import** (leads, customers) | ✅ | ✅ | ✅ | ✅ ² | ❌ |
| **Products** view | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products create / edit / delete | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Invoices** view | ✅ | ✅ | 🔍 | 🔍 | 🔍 |
| Invoices create / edit / status / delete | ✅ | ✅ | 🔍 | 🔍 | ❌ |
| **Payments** view / record | ✅ | ✅ | 🔍 | 🔍 | 🔍 / ❌ |
| **Activities / tasks** view / create / complete | ✅ | ✅ | ✅ | ✅ | ✅ |
| Activities edit / delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Calendar** view / create | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar edit / delete | ✅ | ✅ | 🔍 | 🔍 | 🔍 |
| **Notifications** (own only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reports**, AI lead scores / forecast / insights | ✅ | ✅ | 🔍 ³ | ❌ | ❌ |
| AI next-best-actions | ✅ | ✅ | 🔍 | 🔍 | 🔍 |
| Dashboard `summary` / `admin-summary` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard `manager-summary` | ✅ | ✅ | ✅ ³ | ❌ | ❌ |
| Dashboard `sales-summary` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Dashboard `employee-summary` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Users** list / view | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users invite / edit / suspend / delete | ✅ | ✅ ⁴ | ❌ | ❌ | ❌ |
| **Teams** list / view | ✅ | ✅ | ✅ | ✅ | ✅ |
| Teams create / edit / delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Company branding** (logo, theme, role themes) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Company profile** (code, currency, time zone) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Personal appearance (dark mode, own theme) | ✅ | ✅ | ✅ | ✅ | ✅ ⁵ |

¹ A SALES user always owns customers they create, may share their own customers, and may not hand a customer to someone else (a manager/admin can). Someone a customer is shared with can view/edit it but not re-share or reassign it.
² SALES imports are always assigned to / owned by the importing user.
³ Team managers: reports, AI results and the manager dashboard cover only their team members (plus themselves). A manager with no team gets company-wide reports and AI results, and a manager dashboard of their own records only. When OWNER/ADMIN open `manager-summary` it shows their own records. Per-source conversion rates used inside lead scoring stay company-wide (anonymous aggregate).
⁴ An ADMIN manages MANAGER / SALES / EMPLOYEE accounts only. Only the OWNER manages ADMINs. Nobody can create another OWNER, change the OWNER's role, deactivate the OWNER, or change/delete their own role/account.
⁵ The personal theme preset only when the company allows it; colour mode always.

## Behaviour details

- A record outside your scope returns **404**, not 403, so ids can't be probed.
- Query filters (`?assignedToId=`, `?ownerId=`) only narrow results; they can never widen the scope.
- A SALES user who creates a lead or deal without an assignee becomes its owner.
- References in request bodies (`customerId`, `assignedToId`, `ownerId`, `leadId`, `attendeeIds`, team `managerId`/`memberIds`, customer `sharedWithIds`) must belong to the caller's company (400 otherwise).
- Duplicate checks report records outside your scope only as "owned by a colleague" — no id or name.
- Team managers must have the MANAGER or ADMIN role.
