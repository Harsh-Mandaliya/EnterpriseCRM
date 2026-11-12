import { useAppSelector } from '@/hooks/useRedux';
import type { Role } from '@/types';

/* ============================================================
   CLIENT-SIDE PERMISSIONS (UX only)
   ------------------------------------------------------------
   Mirrors crm-backend-mongo/src/utils/permissions.ts so screens
   only offer what the role may do. The server still enforces
   every rule — never treat this as a security boundary.
============================================================ */

export type Action =
  | 'lead.create'
  | 'lead.assign'
  | 'lead.convert'
  | 'deal.create'
  | 'deal.assign'
  | 'customer.create'
  | 'customer.reassign'
  | 'task.create'
  | 'task.assign'
  | 'task.edit'
  | 'product.manage'
  | 'invoice.create'
  | 'payment.record'
  | 'event.create'
  | 'reports.view'
  | 'data.export'
  | 'team.manage';

const BUSINESS: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES'];
const COMPANY_WIDE: Role[] = ['OWNER', 'ADMIN', 'MANAGER'];
const ADMINS: Role[] = ['OWNER', 'ADMIN'];
const EVERYONE: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'];

const RULES: Record<Action, Role[]> = {
  'lead.create': BUSINESS,
  'lead.assign': COMPANY_WIDE,
  'lead.convert': BUSINESS,
  'deal.create': BUSINESS,
  'deal.assign': COMPANY_WIDE,
  'customer.create': BUSINESS,
  'customer.reassign': COMPANY_WIDE,
  'task.create': EVERYONE,
  'task.assign': COMPANY_WIDE,
  'task.edit': ADMINS,
  'product.manage': BUSINESS,
  'invoice.create': BUSINESS,
  'payment.record': BUSINESS,
  'event.create': EVERYONE,
  'reports.view': COMPANY_WIDE,
  'data.export': COMPANY_WIDE,
  'team.manage': ADMINS,
};

export function can(role: Role | null | undefined, action: Action): boolean {
  return Boolean(role && RULES[action].includes(role));
}

/** `const allowed = useCan('lead.create');` */
export function useCan(action: Action): boolean {
  const role = useAppSelector(state => state.auth.user?.role);
  return can(role, action);
}
