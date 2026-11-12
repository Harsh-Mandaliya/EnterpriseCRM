import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: {} } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { breakpointsFor } from '@/hooks/useResponsive';
import { ageLabel, filterLeads, leadStatusTone } from '@/screens/leads/LeadListScreen';
import type { Lead } from '@/types';
import { invoiceHtml } from '@/utils/pdf';
import { safePdfName } from '@/utils/pdfExport';
import { splitDocument } from '@/utils/pdfExport.web';

/* v1.4.1 — lead screens, responsive breakpoints, real PDF downloads. */

const lead = (id: string, name: string, status: Lead['status'], extra: Partial<Lead> = {}): Lead =>
  ({
    id,
    name,
    status,
    email: null,
    phone: null,
    source: 'WEBSITE',
    score: null,
    customerId: null,
    assignedToId: null,
    assignedTo: null,
    customer: null,
    createdAt: `2026-11-0${id}T00:00:00.000Z`,
    updatedAt: `2026-11-0${id}T00:00:00.000Z`,
    ...extra,
  }) as Lead;

describe('lead list filtering', () => {
  const leads = [
    lead('1', 'Anjali Boutique', 'NEW', { phone: '+91 98765 10001' }),
    lead('2', 'Green Valley School', 'CONTACTED', { email: 'admin@greenvalley.edu.in' }),
    lead('3', 'Shubh Weddings', 'LOST'),
  ];

  it('filters by status and sorts newest first', () => {
    expect(filterLeads(leads, 'ALL', '').map(l => l.id)).toEqual(['3', '2', '1']);
    expect(filterLeads(leads, 'CONTACTED', '').map(l => l.name)).toEqual(['Green Valley School']);
  });

  it('searches name, e-mail and phone digits', () => {
    expect(filterLeads(leads, 'ALL', 'valley').map(l => l.id)).toEqual(['2']);
    expect(filterLeads(leads, 'ALL', 'greenvalley.edu').map(l => l.id)).toEqual(['2']);
    expect(filterLeads(leads, 'ALL', '98765 100').map(l => l.id)).toEqual(['1']);
  });

  it('labels status tones and ages', () => {
    expect(leadStatusTone('CONVERTED')).toBe('success');
    expect(leadStatusTone('LOST')).toBe('danger');
    expect(ageLabel(new Date().toISOString())).toBe('today');
  });
});

describe('responsive breakpoints', () => {
  it('phone, tablet and desktop layouts', () => {
    expect(breakpointsFor(375)).toMatchObject({ columns: 1, kpiColumns: 2, gutter: 16, isTablet: false });
    expect(breakpointsFor(320)).toMatchObject({ isSmallPhone: true, gutter: 12 });
    expect(breakpointsFor(768)).toMatchObject({ columns: 2, isTablet: true, gutter: 24 });
    expect(breakpointsFor(1440)).toMatchObject({ columns: 3, kpiColumns: 4, isDesktop: true });
  });
});

describe('PDF downloads', () => {
  it('gives files a safe, readable name', () => {
    expect(safePdfName('INV-0004.pdf')).toBe('INV-0004.pdf');
    expect(safePdfName('Statement-Patel Garments Co.')).toBe('Statement-Patel-Garments-Co..pdf');
    expect(safePdfName('a/b\\c:d')).toBe('a-b-c-d.pdf');
    expect(safePdfName('')).toBe('document.pdf');
  });

  it('web export keeps the scoped styles and the document body', () => {
    const html = invoiceHtml({
      invoice: {
        id: 'i',
        invoiceNumber: 'INV-1',
        customerId: 'c',
        customer: { id: 'c', name: 'Acme', email: null, phone: null },
        lineItems: [{ productId: null, description: 'X', quantity: 1, unitPrice: 100 }],
        subtotal: 100,
        tax: 18,
        total: 118,
        status: 'PENDING',
        issueDate: '2026-11-01',
        dueDate: '2026-11-30',
        notes: null,
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
      },
      payments: [],
      company: { name: 'Seller' },
    });
    const { styles, body } = splitDocument(html);
    expect(styles).toContain('.crm-doc .totals');
    // No global selectors that could restyle the app page.
    expect(styles).not.toMatch(/(^|\})\s*(body|table|th|td)\s*\{/m);
    expect(body).toContain('class="crm-doc"');
    expect(body).toContain('TAX INVOICE');
  });
});
