# Demo data — two companies

Two complete companies for testing roles, permissions and company isolation.
They are created **through the API** (`crm-backend-mongo/scripts/seed-demo.ts`),
so every record passed the same validation and permission checks as real use.

```bash
cd crm-backend-mongo
npm run dev            # API on :4000
npm run seed:demo      # in a second terminal; skips a company that already exists
```

> Local testing only. Change these passwords (or delete the companies) before any shared or production use.

## Sign-in details

Passwords follow the app's policy (8+ characters, an uppercase letter and a number).

### Company 1 — Shree Ganesh Textiles Pvt Ltd · company code `sg-textiles`

Theme: **Sunset** (orange), rounded corners; SALES users see **Emerald**; personal themes allowed.

| Role | Name | E-mail | Password |
|---|---|---|---|
| OWNER | Harsh Mandaliya | harsh.owner@sgtextiles.com | Harsh@123456 |
| ADMIN | Trusha Patel | trusha.admin@sgtextiles.com | Trusha@123456 |
| MANAGER | Pari Mehta | pari.manager@sgtextiles.com | Pari@123456 |
| SALES | Ritik Shah | ritik.sales@sgtextiles.com | Ritik@123456 |
| SALES (outside the team) | Neha Desai | neha.sales@sgtextiles.com | Neha@123456 |
| EMPLOYEE | Dhruv Joshi | dhruv.emp@sgtextiles.com | Dhruv@123456 |

Team **Gujarat Sales** — manager Pari; members Ritik and Dhruv. Neha is deliberately outside the team.

### Company 2 — Nova Electronics Pvt Ltd · company code `nova-electronics`

Theme: **Royal** (indigo #4338CA / sky #0EA5E9), pill corners, compact; SALES users see **Graphite**; personal themes **locked**.

| Role | Name | E-mail | Password |
|---|---|---|---|
| OWNER | Aarav Kapoor | aarav.owner@novaelectronics.com | Aarav@123456 |
| ADMIN | Meera Iyer | meera.admin@novaelectronics.com | Meera@123456 |
| MANAGER | Kabir Singh | kabir.manager@novaelectronics.com | Kabir@123456 |
| SALES | Ananya Rao | ananya.sales@novaelectronics.com | Ananya@123456 |
| SALES (outside the team) | Vikram Nair | vikram.sales@novaelectronics.com | Vikram@123456 |
| EMPLOYEE | Rohan Verma | rohan.emp@novaelectronics.com | Rohan@123456 |

Team **South Enterprise** (Bengaluru & Chennai) — manager Kabir; members Ananya and Rohan.

## What each company contains

| Module | Shree Ganesh Textiles | Nova Electronics |
|---|---|---|
| Users | 6 (all 5 roles + a second sales rep) | 6 |
| Teams | 1 | 1 |
| Products | 5 (fabric rolls, Banarasi saree, uniforms, dyeing service) | 5 (LED panel, solar inverter, IoT gateway, CCTV kit, AMC) |
| Customers | 7 (6 + 1 from lead conversion), Indian addresses, GSTINs | 6 (5 + 1 from conversion) |
| Leads | 8 — New, Contacted, Qualified, Unqualified, Lost, 1 Converted | 6 — incl. 1 Converted, 1 Lost |
| Deals | 8 across all stages (2 won, 1 lost, 1 overdue), spread over 6 months | 7 (2 won, 1 lost) |
| Invoices | 5 — 2 paid, 1 part-paid, 1 overdue unpaid, 1 open (5–18 % GST) | 4 — 2 paid, 1 part-paid, 1 overdue |
| Payments | 3 (NEFT / UPI with UTR references) | 3 |
| Tasks | 6 + 1 conversion note (overdue, upcoming, done) | 5 + 1 note |
| Calendar | 4 (review, demo, follow-up, GST deadline) | 4 |
| Alerts | Assignment notifications + "Needs attention" (overdue invoice, overdue tasks, stalled deal, upcoming meetings) | same |
| Billing details | Surat address, GSTIN 24AAKCS4821M1Z3, HDFC bank details | Bengaluru address, GSTIN 29AAHCN7311K1Z8, ICICI bank details |
| Work log | Backfilled "who did what" history | same |

## What each role should see (use this to spot mismatches)

| Signed in as | Customers | Leads | Deals | Invoices | Payments |
|---|---|---|---|---|---|
| SG OWNER / ADMIN | 7 | 8 | 8 | 5 | 3 |
| SG MANAGER (Pari, team) | 5 | 5 | 6 | 4 | 2 |
| SG SALES (Ritik) | 4 | 4 | 5 | 3 | 2 |
| SG SALES (Neha) | 2 | 3 | 2 | 1 | 1 |
| SG EMPLOYEE | 0 | — | — | — | — |
| Nova OWNER / ADMIN | 6 | 6 | 7 | 4 | 3 |
| Nova MANAGER (Kabir, team) | 3 | 4 | 4 | 3 | 2 |
| Nova SALES (Ananya) | 2 | 3 | 3 | 2 | 2 |
| Nova SALES (Vikram) | 3 | 2 | 3 | 1 | 1 |
| Nova EMPLOYEE | 0 | — | — | — | — |

Products are shared company-wide. Since v1.4 **tasks and calendar follow the hierarchy** too — e.g. SG: Owner/Admin 7 tasks, Pari (team) 6, Ritik 4, Neha 1, Dhruv 2; calendar: company events from the owner/admin are visible to everyone, other events only to their creator's hierarchy and invited attendees.
Nothing from one company may ever appear for the other.
