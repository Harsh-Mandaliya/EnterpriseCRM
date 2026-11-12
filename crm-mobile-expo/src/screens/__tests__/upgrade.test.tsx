import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';

import authReducer from '@/redux/slices/authSlice';
import brandingReducer from '@/redux/slices/brandingSlice';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Invoice, Me, Payment, Role } from '@/types';
import { amountInWords, escapeHtml, invoiceHtml, receiptHtml, reportHtml } from '@/utils/pdf';
import { describeWork } from '@/api/insights.api';
import { customerTotals } from '@/screens/customers/CustomerDetailScreen';
import { monthGrid, weekDays } from '@/screens/calendar/CalendarScreen';
import { paidAmount } from '@/screens/invoices/InvoiceDetailScreen';
import { previewCompanyCode } from '@/screens/auth/RegisterScreen';
import { NotificationListScreen } from '@/screens/notifications/NotificationListScreen';
import { ReportsScreen } from '@/screens/reports/ReportsScreen';

/* v1.4 — PDFs, hierarchy-scoped reports, alerts with reasons. */

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(), printAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(fn, []);
  },
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const mockSalesReport = jest.fn<() => Promise<unknown[]>>();
const mockAttention = jest.fn<() => Promise<unknown>>();

jest.mock('@/api/reports.api', () => ({
  getSalesReport: () => mockSalesReport(),
  getLeadConversionReport: () => Promise.resolve([]),
  getTopCustomersReport: () => Promise.resolve([]),
}));
jest.mock('@/api/insights.api', () => ({
  ...jest.requireActual<object>('@/api/insights.api'),
  getReceivables: () =>
    Promise.resolve({
      totals: { invoiced: 11800, collected: 5000, outstanding: 6800, overdue: 6800, overdueCount: 1, invoiceCount: 1, collectionRate: 42.4 },
      aging: { current: 0, d1_30: 6800, d31_60: 0, d61_90: 0, d90plus: 0 },
      byCustomer: [{ id: 'c1', name: 'Acme Buyers', invoiced: 11800, paid: 5000, outstanding: 6800, overdue: 6800, invoices: 1, lastPaymentAt: null }],
      byMethod: [{ method: 'UPI', count: 1, total: 5000 }],
      monthly: [],
      collectors: [],
    }),
  getTeamPerformance: () => Promise.resolve({ days: 30, since: '', totals: { people: 1, openLeads: 0, untouchedLeads: 0, openPipeline: 0, wonValue: 0, tasksCompleted: 0, tasksOverdue: 0, collected: 0 }, members: [] }),
  getAttention: () => mockAttention(),
}));
jest.mock('@/api/leads.api', () => ({ listLeads: () => Promise.resolve([]) }));
jest.mock('@/api/opportunities.api', () => ({ listOpportunities: () => Promise.resolve([]) }));
jest.mock('@/api/company.api', () => ({ getBranding: () => Promise.reject(new Error('offline')) }));
jest.mock('@/api/notifications.api', () => ({
  listNotifications: () => Promise.resolve([]),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

function renderWith(role: Role, element: React.ReactElement) {
  const user = { id: 'u1', name: 'Test', email: 't@example.test', role, companyId: 'c1', createdAt: '2026-01-01', company: { id: 'c1', name: 'Acme' } } as Me;
  const store = configureStore({
    reducer: { auth: authReducer, branding: brandingReducer },
    preloadedState: { auth: { status: 'authenticated' as const, isSubmitting: false, error: null, user } },
  });
  return render(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>
    </Provider>,
  );
}

const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true, getState: () => ({ routeNames: ['InvoiceDetail'] }), addListener: () => () => undefined };

const invoice: Invoice = {
  id: 'i1',
  invoiceNumber: 'INV-0042',
  customerId: 'c1',
  customer: { id: 'c1', name: 'Acme <Buyers>', email: 'a@b.test', phone: '+91 90000 00000', address: 'MG Road, Pune', gstin: '27AABCU9603R1ZM' },
  lineItems: [{ productId: null, description: 'Cotton roll', quantity: 10, unitPrice: 1000 }],
  subtotal: 10000,
  tax: 1800,
  total: 11800,
  status: 'PENDING',
  issueDate: '2026-11-01T00:00:00.000Z',
  dueDate: '2026-11-10T00:00:00.000Z',
  notes: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const payment = (id: string, amount: number, invoiceId = 'i1'): Payment => ({
  id,
  invoiceId: { id: invoiceId, invoiceNumber: 'INV-0042', total: 11800, status: 'PENDING' },
  customerId: { id: 'c1', name: 'Acme' },
  amount,
  method: 'UPI',
  status: 'COMPLETED',
  reference: 'UTR123',
  paidAt: '2026-11-05T00:00:00.000Z',
  createdAt: '2026-11-05T00:00:00.000Z',
});

describe('PDF documents', () => {
  it('writes amounts in Indian words', () => {
    expect(amountInWords(11800)).toBe('Eleven Thousand Eight Hundred Rupees Only');
    expect(amountInWords(12345678)).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees Only');
    expect(amountInWords(10.5)).toBe('Ten Rupees and Fifty Paise Only');
  });

  it('builds a GST bill with both parties, totals, balance and escaped text', () => {
    const html = invoiceHtml({
      invoice,
      payments: [payment('p1', 5000)],
      company: { name: 'Seller Co', billing: { legalName: 'Seller Co Pvt Ltd', address: 'Surat', gstin: '24AAKCS4821M1Z3', phone: null, email: null, bankDetails: 'HDFC A/c 1' } },
    });
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('INV-0042');
    expect(html).toContain('Seller Co Pvt Ltd');
    expect(html).toContain('24AAKCS4821M1Z3');
    expect(html).toContain('27AABCU9603R1ZM');
    expect(html).toContain('GST (18%)');
    expect(html).toContain('₹6,800.00'); // balance
    expect(html).toContain('Acme &lt;Buyers&gt;');
    expect(html).not.toContain('Acme <Buyers>');
  });

  it('builds a receipt with paid-to-date and balance', () => {
    const html = receiptHtml({ payment: payment('p1', 5000), invoiceNumber: 'INV-0042', invoiceTotal: 11800, paidToDate: 5000, customerName: 'Acme', company: { name: 'Seller Co' } });
    expect(html).toContain('PAYMENT RECEIPT');
    expect(html).toContain('UTR123');
    expect(html).toContain('Five Thousand Rupees Only');
    expect(html).toContain('₹6,800.00');
  });

  it('report tables escape cells', () => {
    const html = reportHtml({ title: 'X', company: { name: 'C' }, sections: [{ title: 'T', table: [['A'], ['<script>']] }] });
    expect(html).toContain('&lt;script&gt;');
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });
});

describe('money maths', () => {
  it('invoice paid amount: status PAID always counts as fully paid', () => {
    expect(paidAmount(invoice, [payment('p1', 5000)])).toBe(5000);
    expect(paidAmount({ ...invoice, status: 'PAID' }, [])).toBe(11800);
    expect(paidAmount({ ...invoice, status: 'PAID' }, [payment('p1', 5000)])).toBe(11800);
    expect(paidAmount(invoice, [payment('p1', 99999)])).toBe(11800);
  });

  it('customer statement totals: billed, paid, outstanding, overdue', () => {
    const now = new Date('2026-11-20').getTime();
    const second: Invoice = { ...invoice, id: 'i2', total: 1000, dueDate: '2026-12-31T00:00:00.000Z' };
    const t = customerTotals([invoice, second], [payment('p1', 5000)], now);
    expect(t).toEqual({ billed: 12800, paid: 5000, outstanding: 7800, overdue: 6800 });
  });
});

describe('calendar grid', () => {
  it('month grid starts on Monday and covers six weeks', () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1);
    expect(grid[6].getDate()).toBe(1);
  });
  it('week runs Monday to Sunday', () => {
    const w = weekDays(new Date(2026, 10, 12));
    expect(w[0].getDay()).toBe(1);
    expect(w[6].getDay()).toBe(0);
  });
});

describe('wording', () => {
  it('describes work log entries in plain language', () => {
    expect(
      describeWork({ id: '1', action: 'deal.stage_changed', targetType: 'Opportunity', targetId: 'd', label: 'Acme order', details: { from: 'PROPOSAL', to: 'WON' }, actor: null, at: '' }),
    ).toBe('moved deal “Acme order” from Proposal to Won');
    expect(describeWork({ id: '2', action: 'payment.recorded', targetType: 'Payment', targetId: 'p', label: null, details: { amount: 5000, method: 'UPI' }, actor: null, at: '' })).toBe(
      'recorded a payment of ₹5,000 by Upi',
    );
  });
  it('previews the company code', () => {
    expect(previewCompanyCode('Sunrise Exports Pvt. Ltd')).toBe('sunrise-exports-pvt-ltd');
    expect(previewCompanyCode('')).toBe('your-company');
  });
});

describe('ReportsScreen', () => {
  beforeEach(() => {
    mockSalesReport.mockReset();
    mockSalesReport.mockResolvedValue([]);
  });

  it('shows money owed for a SALES rep without calling company revenue reports', async () => {
    renderWith('SALES', <ReportsScreen navigation={navigation as never} route={{ key: 'r', name: 'Reports' } as never} />);
    expect(await screen.findByText('Your own work')).toBeTruthy();
    fireEvent.press(screen.getByText('Money'));
    expect(await screen.findByText('Who pays, who owes')).toBeTruthy();
    expect(screen.getByText('Acme Buyers')).toBeTruthy();
    expect(mockSalesReport).not.toHaveBeenCalled();
  });

  it('requests revenue for an OWNER', async () => {
    renderWith('OWNER', <ReportsScreen navigation={navigation as never} route={{ key: 'r', name: 'Reports' } as never} />);
    expect(await screen.findByText('Whole company')).toBeTruthy();
    expect(mockSalesReport).toHaveBeenCalled();
  });
});

describe('Alerts — needs attention', () => {
  it('groups by severity and explains why each matters', async () => {
    mockAttention.mockResolvedValue({
      items: [
        { id: 'invoice-1', kind: 'INVOICE_OVERDUE', severity: 'high', title: 'INV-0042 · Acme', detail: '₹6,800 unpaid', why: 'Unpaid invoices hurt cash flow.', relatedType: 'Invoice', relatedId: 'i1', owner: null, at: null, amount: 6800 },
        { id: 'lead-1', kind: 'LEAD_STALE', severity: 'medium', title: 'Cold lead', detail: 'NEW · no update for 9 day(s)', why: 'Leads go cold quickly.', relatedType: 'Lead', relatedId: 'l1', owner: 'Ravi', at: null, amount: null },
      ],
      counts: { high: 1, medium: 1, info: 0 },
    });
    renderWith('SALES', <NotificationListScreen navigation={navigation as never} route={{ key: 'n', name: 'NotificationList' } as never} />);
    expect(await screen.findByText('Act now · 1')).toBeTruthy();
    expect(screen.getByText('This week · 1')).toBeTruthy();
    expect(screen.queryByText('Unpaid invoices hurt cash flow.')).toBeNull();
    fireEvent.press(screen.getAllByText('Why it matters')[0]);
    expect(screen.getByText('Unpaid invoices hurt cash flow.')).toBeTruthy();
    fireEvent.press(screen.getByText('INV-0042 · Acme'));
    expect(navigation.navigate).toHaveBeenCalledWith('InvoiceDetail', { invoiceId: 'i1' });
  });
});
