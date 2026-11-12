import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import authReducer from '@/redux/slices/authSlice';
import brandingReducer from '@/redux/slices/brandingSlice';
import opportunitiesReducer from '@/redux/slices/opportunitiesSlice';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Me, Opportunity, Role } from '@/types';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';
import { LeadFormScreen } from '@/screens/forms/LeadFormScreen';
import { PipelineScreen } from '@/screens/pipeline/PipelineScreen';
import { CustomerListScreen } from '@/screens/customers/CustomerListScreen';
import { ProductListScreen } from '@/screens/products/ProductListScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(fn, []);
  },
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const mockCreateLead = jest.fn<(input: unknown) => Promise<unknown>>();
const mockListUsers = jest.fn<() => Promise<unknown[]>>();
const mockListOpps = jest.fn<() => Promise<Opportunity[]>>();
const mockSalesReport = jest.fn<() => Promise<unknown[]>>();

jest.mock('@/api/leads.api', () => ({
  createLead: (input: unknown) => mockCreateLead(input),
  updateLead: jest.fn(),
  updateLeadStatus: jest.fn(),
  listLeads: () => Promise.resolve([]),
}));
jest.mock('@/api/users.api', () => ({ listUsers: () => mockListUsers() }));
jest.mock('@/api/customer.api', () => ({ listCustomers: () => Promise.resolve({ items: [], pagination: {} }) }));
jest.mock('@/api/opportunities.api', () => ({
  listOpportunities: () => mockListOpps(),
  updateOpportunityStage: jest.fn(),
  createOpportunity: jest.fn(),
}));
const mockListActivities = jest.fn<() => Promise<unknown[]>>(() => Promise.resolve([]));
jest.mock('@/api/activities.api', () => ({ listActivities: () => mockListActivities() }));
jest.mock('@/api/reports.api', () => ({
  getSalesReport: () => mockSalesReport(),
  getTopCustomersReport: () => Promise.resolve([]),
}));
jest.mock('@/api/products.api', () => ({ listProducts: () => Promise.resolve([]), createProduct: jest.fn() }));
jest.mock('@/api/ai.api', () => ({ getSalesForecast: () => Promise.resolve(null) }));

function makeStore(role: Role) {
  const user = {
    id: 'u1',
    name: 'Test',
    email: 't@example.test',
    role,
    companyId: 'c1',
    createdAt: '2026-01-01',
    company: { id: 'c1', name: 'Acme' },
  } as Me;
  return configureStore({
    reducer: { auth: authReducer, branding: brandingReducer, opportunities: opportunitiesReducer },
    preloadedState: {
      auth: { status: 'authenticated' as const, isSubmitting: false, error: null, user },
    },
  });
}

function renderWith(role: Role, element: React.ReactElement) {
  const store = makeStore(role);
  render(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>
    </Provider>,
  );
  return store;
}

const navigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  canGoBack: () => true,
  addListener: () => () => undefined,
  getState: () => ({ routeNames: [] }),
};

describe('LeadFormScreen (role-aware)', () => {
  beforeEach(() => {
    mockCreateLead.mockReset();
    mockListUsers.mockResolvedValue([{ id: 'u2', name: 'Ravi', email: 'r@x.test', role: 'SALES' }]);
    navigation.goBack.mockReset();
  });

  it('a SALES rep sees "assigned to you" instead of an assignee picker', async () => {
    renderWith('SALES', <LeadFormScreen navigation={navigation as never} route={{ key: 'k', name: 'LeadForm', params: undefined } as never} />);
    expect(await screen.findByText('This lead will be assigned to you.')).toBeTruthy();
    expect(screen.queryByText('Assigned to')).toBeNull();
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('a MANAGER can choose the assignee', async () => {
    renderWith('MANAGER', <LeadFormScreen navigation={navigation as never} route={{ key: 'k', name: 'LeadForm', params: undefined } as never} />);
    expect(await screen.findByText('Assigned to')).toBeTruthy();
  });

  it('validates before calling the API, then creates and goes back', async () => {
    mockCreateLead.mockResolvedValue({});
    renderWith('SALES', <LeadFormScreen navigation={navigation as never} route={{ key: 'k', name: 'LeadForm', params: undefined } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'Create lead' }));
    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(mockCreateLead).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Full name or company'), 'Priya Sharma');
    fireEvent.changeText(screen.getByLabelText('E-mail'), 'not-an-email');
    fireEvent.press(screen.getByRole('button', { name: 'Create lead' }));
    expect(await screen.findByText('Enter a valid e-mail address')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('E-mail'), 'priya@example.test');
    fireEvent.press(screen.getByRole('button', { name: 'Create lead' }));
    await waitFor(() => expect(mockCreateLead).toHaveBeenCalled());
    expect(mockCreateLead.mock.calls[0][0]).toMatchObject({ name: 'Priya Sharma', email: 'priya@example.test', allowDuplicate: false });
    expect(mockCreateLead.mock.calls[0][0]).not.toHaveProperty('assignedToId');
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });
});

describe('PipelineScreen', () => {
  const deals = [
    { id: 'd1', title: 'Big supply order', amount: 400000, stage: 'NEGOTIATION', closeDate: null, leadId: null, customerId: null, ownerId: null, owner: null, customer: null, createdAt: '2026-11-01', updatedAt: '2026-11-01' },
    { id: 'd2', title: 'Pilot', amount: 50000, stage: 'WON', closeDate: null, leadId: null, customerId: null, ownerId: null, owner: null, customer: null, createdAt: '2026-11-01', updatedAt: '2026-11-01' },
  ] as Opportunity[];

  it('shows columns, deals and the create button only for roles that may create', async () => {
    mockListOpps.mockResolvedValue(deals);
    renderWith('SALES', <PipelineScreen navigation={navigation as never} route={{ key: 'p', name: 'Pipeline' } as never} />);
    expect(await screen.findByText('Big supply order')).toBeTruthy();
    expect(screen.getAllByText('Negotiation').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'New deal' })).toBeTruthy();
  });

  it('hides "New deal" for EMPLOYEE', async () => {
    mockListOpps.mockResolvedValue(deals);
    renderWith('EMPLOYEE', <PipelineScreen navigation={navigation as never} route={{ key: 'p', name: 'Pipeline' } as never} />);
    expect(await screen.findByText('Big supply order')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New deal' })).toBeNull();
  });
});

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    mockListOpps.mockResolvedValue([]);
    mockSalesReport.mockReset();
    mockSalesReport.mockResolvedValue([{ year: 2026, month: 11, revenue: 1000, invoiceCount: 1 }]);
  });

  it('never requests revenue reports for a SALES rep', async () => {
    renderWith('SALES', <AnalyticsScreen navigation={navigation as never} route={{ key: 'a', name: 'Analytics' } as never} />);
    expect(await screen.findByText('Deals by stage')).toBeTruthy();
    expect(screen.getByText('Your own pipeline')).toBeTruthy();
    expect(mockSalesReport).not.toHaveBeenCalled();
    expect(screen.queryByText('Collected revenue (paid invoices)')).toBeNull();
  });

  it('counts only tasks assigned to the rep', async () => {
    const task = (id: string, assignedToId: string, status = 'PENDING') => ({ id, type: 'TASK', summary: id, status, assignedToId, dueAt: null });
    mockListActivities.mockResolvedValueOnce([task('mine', 'u1'), task('mine-done', 'u1', 'COMPLETED'), task('colleague', 'u9'), task('colleague2', 'u9')]);
    renderWith('SALES', <AnalyticsScreen navigation={navigation as never} route={{ key: 'a', name: 'Analytics' } as never} />);
    expect(await screen.findByText('Tasks & follow-ups')).toBeTruthy();
    // centre of the donut = open tasks: 1 own, not 3 company-wide
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.queryByText('3')).toBeNull();
  });

  it('shows revenue for an ADMIN', async () => {
    renderWith('ADMIN', <AnalyticsScreen navigation={navigation as never} route={{ key: 'a', name: 'Analytics' } as never} />);
    expect(await screen.findByText('Collected revenue (paid invoices)')).toBeTruthy();
    expect(mockSalesReport).toHaveBeenCalled();
  });
});

describe('create buttons follow role rules', () => {
  // The server rejects these for EMPLOYEE with 403, so the app must not offer them.
  it('EMPLOYEE gets no Add customer / Add product buttons', async () => {
    renderWith('EMPLOYEE', <CustomerListScreen navigation={navigation as never} route={{ key: 'c', name: 'CustomerList' } as never} />);
    expect(await screen.findByText('Customers shared with you will appear here.')).toBeTruthy();
    expect(screen.queryByText('New customer')).toBeNull();
    screen.unmount();

    renderWith('EMPLOYEE', <ProductListScreen />);
    expect(await screen.findByText('Products added by your team will appear here.')).toBeTruthy();
    expect(screen.queryByText('Add product')).toBeNull();
    expect(screen.queryByLabelText('Add product')).toBeNull();
  });

  it('SALES keeps them', async () => {
    renderWith('SALES', <CustomerListScreen navigation={navigation as never} route={{ key: 'c', name: 'CustomerList' } as never} />);
    expect(await screen.findByText('New customer')).toBeTruthy();
    screen.unmount();
    renderWith('SALES', <ProductListScreen />);
    expect(await screen.findByLabelText('Add product')).toBeTruthy();
  });
});
