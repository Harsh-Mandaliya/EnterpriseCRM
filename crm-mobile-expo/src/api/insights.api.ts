import { apiClient } from '@/api/client';
import type { Role } from '@/types';

/* ============================================================
   Hierarchy-scoped insights (v1.4). The server limits every
   result to what the signed-in user may see: OWNER/ADMIN the
   company, a team manager their team, reps their own work.
============================================================ */

export interface MemberPerformance {
  user: { id: string; name: string; role: Role; isActive: boolean };
  leads: { total: number; open: number; untouched: number; converted: number; lost: number };
  deals: { open: number; openValue: number; won: number; wonValue: number; lost: number; overdue: number };
  tasks: { pending: number; overdue: number; completed: number };
  invoices: { count: number; total: number };
  collected: { count: number; total: number };
  activity: { actions: number; lastActiveAt: string | null };
  flags: string[];
}

export interface TeamPerformance {
  days: number;
  since: string;
  totals: {
    people: number;
    openLeads: number;
    untouchedLeads: number;
    openPipeline: number;
    wonValue: number;
    tasksCompleted: number;
    tasksOverdue: number;
    collected: number;
  };
  members: MemberPerformance[];
}

export type WorkTargetType = 'Lead' | 'Opportunity' | 'Customer' | 'Invoice' | 'Payment' | 'Activity' | 'CalendarEvent';

export interface WorkLogEntry {
  id: string;
  action: string;
  targetType: WorkTargetType | string;
  targetId: string | null;
  label: string | null;
  details: Record<string, unknown>;
  actor: { id: string; name: string; role: Role } | null;
  at: string;
}

export interface Receivables {
  totals: {
    invoiced: number;
    collected: number;
    outstanding: number;
    overdue: number;
    overdueCount: number;
    invoiceCount: number;
    collectionRate: number;
  };
  aging: { current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number };
  byCustomer: {
    id: string;
    name: string;
    invoiced: number;
    paid: number;
    outstanding: number;
    overdue: number;
    invoices: number;
    lastPaymentAt: string | null;
  }[];
  byMethod: { method: string; count: number; total: number }[];
  monthly: { year: number; month: number; total: number; count: number }[];
  collectors: { user: { id: string; name: string } | null; count: number; total: number }[];
}

export type AttentionKind = 'TASK_OVERDUE' | 'TASK_DUE_TODAY' | 'INVOICE_OVERDUE' | 'DEAL_OVERDUE' | 'LEAD_STALE' | 'EVENT_SOON';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: 'high' | 'medium' | 'info';
  title: string;
  detail: string;
  why: string;
  relatedType: 'Activity' | 'Invoice' | 'Opportunity' | 'Lead' | 'CalendarEvent';
  relatedId: string;
  owner: string | null;
  at: string | null;
  amount: number | null;
}

export async function getTeamPerformance(days = 30): Promise<TeamPerformance> {
  const { data } = await apiClient.get<TeamPerformance>('/reports/team-performance', { params: { days } });
  return data;
}

export async function getWorkLog(params: {
  days?: number;
  userId?: string;
  targetType?: WorkTargetType;
  targetId?: string;
  limit?: number;
}): Promise<WorkLogEntry[]> {
  const { data } = await apiClient.get<WorkLogEntry[]>('/reports/work-log', { params });
  return data;
}

export async function getReceivables(): Promise<Receivables> {
  const { data } = await apiClient.get<Receivables>('/reports/receivables');
  return data;
}

export async function getAttention(): Promise<{ items: AttentionItem[]; counts: Record<string, number> }> {
  const { data } = await apiClient.get('/notifications/attention');
  return data;
}

/* ---------------- human wording for work-log entries ---------------- */

const STAGE: Record<string, string> = {
  PROSPECTING: 'Prospecting',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

const titleCase = (v: unknown) =>
  typeof v === 'string' ? (STAGE[v] ?? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ')) : '';

const money = (v: unknown) => (typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : '');

/** "moved deal Acme order from Proposal to Won" — without the actor's name. */
export function describeWork(entry: WorkLogEntry): string {
  const d = entry.details;
  const label = entry.label ? `“${entry.label}”` : '';
  switch (entry.action) {
    case 'lead.created':
      return `added lead ${label}`;
    case 'lead.status_changed':
      return `moved lead ${label} from ${titleCase(d.from)} to ${titleCase(d.to)}`;
    case 'lead.assigned':
      return `assigned lead ${label}${d.to ? ` to ${d.to}` : ''}`;
    case 'lead.converted':
      return `converted lead ${label} into a customer`;
    case 'deal.created':
      return `created deal ${label} (${money(d.amount)})`;
    case 'deal.stage_changed':
      return `moved deal ${label} from ${titleCase(d.from)} to ${titleCase(d.to)}`;
    case 'customer.created':
      return `added customer ${label}`;
    case 'invoice.created':
      return `raised invoice ${label} for ${money(d.total)}`;
    case 'invoice.status_changed':
      return `marked invoice ${label} as ${titleCase(d.to)}`;
    case 'payment.recorded':
      return `recorded a payment of ${money(d.amount)}${d.method ? ` by ${titleCase(d.method)}` : ''}`;
    case 'task.created':
      return `created ${titleCase(d.type).toLowerCase() || 'task'} ${label}`;
    case 'task.completed':
      return `completed ${titleCase(d.type).toLowerCase() || 'task'} ${label}`;
    case 'event.created':
      return `scheduled ${label}`;
    default:
      return `${entry.action.replace(/[._]/g, ' ')} ${label}`;
  }
}

export function workIcon(action: string): string {
  if (action.startsWith('lead')) return 'person-add-outline';
  if (action.startsWith('deal')) return 'git-branch-outline';
  if (action.startsWith('customer')) return 'business-outline';
  if (action.startsWith('invoice')) return 'document-text-outline';
  if (action.startsWith('payment')) return 'cash-outline';
  if (action.startsWith('task')) return action.endsWith('completed') ? 'checkmark-done-outline' : 'checkbox-outline';
  if (action.startsWith('event')) return 'calendar-outline';
  return 'ellipse-outline';
}
