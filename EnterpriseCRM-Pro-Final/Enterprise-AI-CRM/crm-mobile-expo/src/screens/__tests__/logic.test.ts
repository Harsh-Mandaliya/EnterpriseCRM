import { describe, expect, it, jest } from '@jest/globals';

import { computeInvoiceTotals } from '@/screens/invoices/InvoiceFormScreen';
import { leadFunnel, monthlyDealValue, ownerLeaderboard, pipelineKpis, summarizeStages } from '@/screens/pipeline/pipelineMath';
import { formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { passwordScore } from '@/screens/auth/components/PasswordStrength';
import { can } from '@/utils/permissions';
import { parseDateInput, relativeDay, toDateInput } from '@/utils/dates';
import type { Lead, Opportunity } from '@/types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const deal = (over: Partial<Opportunity>): Opportunity =>
  ({
    id: Math.random().toString(36).slice(2),
    title: 'Deal',
    amount: 1000,
    stage: 'PROSPECTING',
    closeDate: null,
    leadId: null,
    customerId: null,
    ownerId: null,
    owner: null,
    customer: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...over,
  }) as Opportunity;

describe('pipeline maths', () => {
  const now = new Date('2026-11-04T12:00:00Z');
  const deals = [
    deal({ stage: 'PROSPECTING', amount: 1000 }),
    deal({ stage: 'PROPOSAL', amount: 2000, closeDate: '2026-11-01T00:00:00Z' }),
    deal({ stage: 'NEGOTIATION', amount: 4000, closeDate: '2026-11-20T00:00:00Z' }),
    deal({ stage: 'WON', amount: 5000, owner: { id: 'u1', name: 'Asha' } }),
    deal({ stage: 'LOST', amount: 3000 }),
  ];

  it('computes KPIs with stage-weighted forecast', () => {
    const k = pipelineKpis(deals, now);
    expect(k.openCount).toBe(3);
    expect(k.openValue).toBe(7000);
    // 1000*0.1 + 2000*0.5 + 4000*0.75
    expect(k.weightedForecast).toBeCloseTo(4100);
    expect(k.wonValue).toBe(5000);
    expect(k.winRate).toBe(0.5);
    expect(k.overdueCount).toBe(1);
    expect(k.closingSoonValue).toBe(4000);
  });

  it('win rate is null before anything closes', () => {
    expect(pipelineKpis([deal({})], now).winRate).toBeNull();
  });

  it('summarises every stage, including empty ones', () => {
    const stages = summarizeStages(deals);
    expect(stages).toHaveLength(6);
    expect(stages.find(s => s.stage === 'QUALIFICATION')).toMatchObject({ count: 0, value: 0 });
  });

  it('lead funnel counts a lead for every stage it has reached', () => {
    const leads = (['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const).map(status => ({ status }) as Lead);
    expect(leadFunnel(leads).map(s => s.count)).toEqual([4, 3, 2, 1]);
  });

  it('buckets deal value by month and ranks owners', () => {
    const months = monthlyDealValue(deals, 3, now);
    expect(months).toHaveLength(3);
    expect(months[2].created).toBe(15000);
    expect(months[2].won).toBe(5000);
    expect(ownerLeaderboard(deals)[0].name).toBe('Asha');
  });
});

describe('invoice totals', () => {
  it('matches the server rounding (invoices.service.ts)', () => {
    expect(
      computeInvoiceTotals(
        [
          { quantity: 3, unitPrice: 333.33 },
          { quantity: 1, unitPrice: 0.01 },
        ],
        18,
      ),
    ).toEqual({ subtotal: 1000, tax: 180, total: 1180 });
  });
});

describe('client permissions mirror the server', () => {
  it('limits creation and assignment by role', () => {
    expect(can('EMPLOYEE', 'lead.create')).toBe(false);
    expect(can('SALES', 'lead.create')).toBe(true);
    expect(can('SALES', 'lead.assign')).toBe(false);
    expect(can('MANAGER', 'lead.assign')).toBe(true);
    expect(can('SALES', 'reports.view')).toBe(false);
    expect(can('EMPLOYEE', 'task.create')).toBe(true);
    expect(can('MANAGER', 'team.manage')).toBe(false);
    expect(can(null, 'task.create')).toBe(false);
  });
});

describe('dates and formatting', () => {
  it('parses strict local dates and rejects impossible ones', () => {
    expect(toDateInput(parseDateInput('2026-02-28', '09:30')!)).toBe('2026-02-28');
    expect(parseDateInput('2026-02-30')).toBeNull();
    expect(parseDateInput('2026-13-01')).toBeNull();
    expect(parseDateInput('2026-01-01', '25:00')).toBeNull();
    expect(parseDateInput('01/02/2026')).toBeNull();
  });

  it('describes relative days', () => {
    const now = new Date(2026, 10, 4, 15);
    expect(relativeDay(new Date(2026, 10, 4, 1), now)).toBe('Today');
    expect(relativeDay(new Date(2026, 10, 5), now)).toBe('Tomorrow');
    expect(relativeDay(new Date(2026, 10, 1), now)).toBe('3 days ago');
  });

  it('formats Indian compact currency', () => {
    expect(formatCompactCurrency(950)).toBe('₹950');
    expect(formatCompactCurrency(42_000)).toBe('₹42K');
    expect(formatCompactCurrency(420_000)).toBe('₹4.2L');
    expect(formatCompactCurrency(13_000_000)).toBe('₹1.3Cr');
  });

  it('scores password strength', () => {
    expect(passwordScore('abc')).toBe(0);
    expect(passwordScore('Str0ngpass')).toBe(3);
    expect(passwordScore('Str0ng-passphrase')).toBe(5);
  });
});
