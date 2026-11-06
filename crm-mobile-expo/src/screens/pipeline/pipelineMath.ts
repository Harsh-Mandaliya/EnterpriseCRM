import { DEAL_STAGES, STAGE_PROBABILITY } from '@/screens/forms/options';
import type { Lead, LeadStatus, Opportunity, OpportunityStage } from '@/types';

/* ============================================================
   PIPELINE MATHS (pure, unit-tested)
   All figures are computed from the deals/leads the API returned,
   which the server has already limited to the caller's scope —
   so a rep's analytics only ever cover their own records.
============================================================ */

export const OPEN_STAGES: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'];

export interface StageSummary {
  stage: OpportunityStage;
  count: number;
  value: number;
  weighted: number;
}

export function summarizeStages(deals: Opportunity[]): StageSummary[] {
  return DEAL_STAGES.map(stage => {
    const inStage = deals.filter(d => d.stage === stage);
    const value = inStage.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    return { stage, count: inStage.length, value, weighted: value * STAGE_PROBABILITY[stage] };
  });
}

export interface PipelineKpis {
  openCount: number;
  openValue: number;
  weightedForecast: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  /** Won / (won + lost), 0–1; null when nothing has closed yet. */
  winRate: number | null;
  averageDeal: number;
  /** Open deals whose close date has passed. */
  overdueCount: number;
  /** Open deals expected to close in the next 30 days. */
  closingSoonValue: number;
}

export function pipelineKpis(deals: Opportunity[], now = new Date()): PipelineKpis {
  const open = deals.filter(d => OPEN_STAGES.includes(d.stage));
  const won = deals.filter(d => d.stage === 'WON');
  const lost = deals.filter(d => d.stage === 'LOST');
  const sum = (list: Opportunity[]) => list.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  return {
    openCount: open.length,
    openValue: sum(open),
    weightedForecast: open.reduce((s, d) => s + (Number(d.amount) || 0) * STAGE_PROBABILITY[d.stage], 0),
    wonCount: won.length,
    wonValue: sum(won),
    lostCount: lost.length,
    winRate: won.length + lost.length > 0 ? won.length / (won.length + lost.length) : null,
    averageDeal: deals.length > 0 ? sum(deals) / deals.length : 0,
    overdueCount: open.filter(d => d.closeDate && new Date(d.closeDate) < now).length,
    closingSoonValue: sum(open.filter(d => d.closeDate && new Date(d.closeDate) >= now && new Date(d.closeDate) <= in30)),
  };
}

export const LEAD_FUNNEL: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'];

/**
 * Funnel counts: a lead counts for every stage it has reached, so
 * a CONVERTED lead is also counted as new, contacted and qualified.
 */
export function leadFunnel(leads: Lead[]): { status: LeadStatus; count: number }[] {
  const rank: Partial<Record<LeadStatus, number>> = { NEW: 0, CONTACTED: 1, QUALIFIED: 2, CONVERTED: 3 };
  return LEAD_FUNNEL.map((status, index) => ({
    status,
    count: leads.filter(l => (rank[l.status] ?? -1) >= index).length,
  }));
}

/** Deals created per month for the last `months` months (oldest first). */
export function monthlyDealValue(deals: Opportunity[], months = 6, now = new Date()) {
  const buckets = Array.from({ length: months }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString('en-IN', { month: 'short' }), won: 0, created: 0 };
  });
  const byKey = new Map(buckets.map(b => [b.key, b]));
  for (const deal of deals) {
    const created = new Date(deal.createdAt);
    const bucket = byKey.get(`${created.getFullYear()}-${created.getMonth()}`);
    if (bucket) bucket.created += Number(deal.amount) || 0;
    if (deal.stage === 'WON') {
      const closed = new Date(deal.updatedAt);
      const wonBucket = byKey.get(`${closed.getFullYear()}-${closed.getMonth()}`);
      if (wonBucket) wonBucket.won += Number(deal.amount) || 0;
    }
  }
  return buckets;
}

/** Top owners by won + open value (for managers and admins). Unowned deals are not a person, so they are left out. */
export function ownerLeaderboard(deals: Opportunity[], limit = 5) {
  const byOwner = new Map<string, { name: string; won: number; open: number; deals: number }>();
  for (const deal of deals) {
    if (!deal.owner) continue;
    const id = deal.owner.id;
    const entry = byOwner.get(id) ?? { name: deal.owner.name, won: 0, open: 0, deals: 0 };
    entry.deals += 1;
    if (deal.stage === 'WON') entry.won += Number(deal.amount) || 0;
    else if (OPEN_STAGES.includes(deal.stage)) entry.open += Number(deal.amount) || 0;
    byOwner.set(id, entry);
  }
  return [...byOwner.values()].sort((a, b) => b.won + b.open - (a.won + a.open)).slice(0, limit);
}
