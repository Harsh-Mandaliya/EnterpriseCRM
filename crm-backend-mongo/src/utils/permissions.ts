// Central definition of the CRM's role hierarchy and what each tier can do.
//
// Every route that needs a role check imports its capability group (or a
// named permission) from here instead of hardcoding role name arrays — one
// place to update the permission model instead of many.
//
// docs/ROLE_PERMISSIONS.md mirrors the PERMISSIONS matrix below; keep the
// two in sync.

export const ROLES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'SALES',
  'EMPLOYEE',
] as const;

export type RoleName =
  (typeof ROLES)[number];

/* ============================================================
   TEAM MANAGEMENT
   ============================================================ */

/**
 * Can invite, edit, and remove teammates.
 */
export const CAN_MANAGE_TEAM: RoleName[] = [
  'OWNER',
  'ADMIN',
];

/* ============================================================
   BUSINESS DATA
   ============================================================ */

/**
 * Can create/edit/delete core business records —
 * customers, leads, opportunities, products,
 * invoices, payments.
 *
 * EMPLOYEE is intentionally excluded.
 */
export const CAN_MANAGE_BUSINESS_DATA: RoleName[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'SALES',
];

/* ============================================================
   REPORTS
   ============================================================ */

/**
 * Can view company-wide reports, analytics,
 * and AI insights.
 */
export const CAN_VIEW_REPORTS: RoleName[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
];

/* ============================================================
   ACTIVITIES
   ============================================================ */

/**
 * Can edit and delete CRM activities/tasks.
 *
 * All authenticated roles can view, create, and complete
 * activities according to the Activity API rules.
 *
 * Only OWNER and ADMIN can modify/delete existing activities.
 */
export const CAN_MANAGE_ACTIVITIES: RoleName[] = [
  'OWNER',
  'ADMIN',
];

/* ============================================================
   COMPANY & BRANDING
   ============================================================ */

/**
 * Can change the company profile and its branding/theme
 * (logo, display name, theme preset, colours, role themes).
 */
export const CAN_MANAGE_BRANDING: RoleName[] = [
  'OWNER',
  'ADMIN',
];

/* ============================================================
   RECORD VISIBILITY
   ============================================================ */

/**
 * Roles that see every lead / deal / calendar event in their
 * company. Every other role (SALES, EMPLOYEE) only sees records
 * assigned to, owned by, or created by them.
 *
 * NOTE: There is no team/territory model yet, so MANAGER is
 * company-wide. See docs/KNOWN_LIMITATIONS.md.
 */
export const COMPANY_WIDE_VISIBILITY: RoleName[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
];

/* ============================================================
   DASHBOARDS
   ============================================================ */

export const DASHBOARD_ACCESS = {
  summary: ['OWNER', 'ADMIN'] as RoleName[],
  admin: ['OWNER', 'ADMIN'] as RoleName[],
  manager: ['OWNER', 'ADMIN', 'MANAGER'] as RoleName[],
  sales: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'] as RoleName[],
  employee: [...ROLES] as RoleName[],
};

/* ============================================================
   HELPERS
   ============================================================ */

export function isRole(
  value: unknown,
): value is RoleName {
  return (
    typeof value === 'string' &&
    (ROLES as readonly string[]).includes(value)
  );
}

export function hasCompanyWideVisibility(
  role: RoleName,
): boolean {
  return COMPANY_WIDE_VISIBILITY.includes(role);
}

/**
 * OWNER and ADMIN always see every record. Unlike
 * hasCompanyWideVisibility this excludes MANAGER, whose view
 * narrows to their team when they lead one.
 */
export function seesEverything(role: RoleName): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * OWNER outranks ADMIN outranks everyone else. An ADMIN may
 * manage MANAGER / SALES / EMPLOYEE accounts but not other
 * ADMINs or the OWNER; only the OWNER manages ADMINs.
 */
export function canManageUserWithRole(
  actor: RoleName,
  target: RoleName,
): boolean {
  if (target === 'OWNER') return false;
  if (actor === 'OWNER') return true;
  if (actor === 'ADMIN') return target !== 'ADMIN';
  return false;
}

/* ============================================================
   DATA EXPORT / IMPORT
   ============================================================ */

/**
 * Can download CSV exports (always limited to the records the
 * caller may see). Exports are audit-logged.
 */
export const CAN_EXPORT_DATA: RoleName[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
];

/**
 * Can bulk-import leads/customers from CSV. SALES imports are
 * always owned by / assigned to the importing user.
 */
export const CAN_IMPORT_DATA: RoleName[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'SALES',
];
