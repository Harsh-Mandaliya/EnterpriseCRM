import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AxiosError, AxiosHeaders } from 'axios';

import { describeDuplicates, getDuplicateMatches } from '@/api/client';
import { LeadConvertCard } from '@/screens/leads/components/LeadConvertCard';
import { passwordProblems } from '@/screens/auth/ResetPasswordScreen';
import { TeamForm } from '@/screens/teams/components/TeamForm';
import type { ConvertLeadResult, Lead, TeamUser } from '@/types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockConvertLead = jest.fn<(id: string, input: unknown) => Promise<ConvertLeadResult>>();
jest.mock('@/api/leads.api', () => ({
  convertLead: (id: string, input: unknown) => mockConvertLead(id, input),
}));

// Confirmation dialogs auto-accept in tests.
jest.mock('@/utils/confirm', () => ({
  confirmAction: () => Promise.resolve(true),
}));

const lead: Lead = {
  id: 'l1',
  name: 'Acme Lead',
  email: 'acme@example.test',
  phone: null,
  source: 'WEBSITE',
  status: 'QUALIFIED',
  score: null,
  customerId: null,
  assignedToId: 'u1',
  assignedTo: { id: 'u1', name: 'Rep' },
  customer: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} as Lead;

describe('passwordProblems', () => {
  it('mirrors the server policy', () => {
    expect(passwordProblems('short')).toEqual(['at least 8 characters', 'an uppercase letter', 'a number']);
    expect(passwordProblems('Str0ngPassw0rd')).toEqual([]);
  });
});

describe('duplicate helpers', () => {
  const config = { headers: new AxiosHeaders() };

  it('extracts matches from a 409 response and hides colleagues’ names', () => {
    const error = new AxiosError('Conflict', '409', config, null, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
      data: {
        error: 'exists',
        details: {
          duplicates: [
            { type: 'lead', matchedOn: ['email'], id: 'x', name: 'Old Lead', visible: true },
            { type: 'customer', matchedOn: ['phone'], visible: false },
          ],
        },
      },
    });
    const matches = getDuplicateMatches(error);
    expect(matches).toHaveLength(2);
    const text = describeDuplicates(matches!);
    expect(text).toContain('“Old Lead”');
    expect(text).toContain('owned by a colleague');
  });

  it('returns null for other errors', () => {
    expect(getDuplicateMatches(new Error('nope'))).toBeNull();
  });
});

describe('LeadConvertCard', () => {
  beforeEach(() => {
    mockConvertLead.mockReset();
  });

  it('converts with a deal amount and reports the result', async () => {
    const result = {
      lead: { ...lead, status: 'CONVERTED' },
      customerId: 'c1',
      opportunityId: 'o1',
      createdCustomer: true,
    } as ConvertLeadResult;
    mockConvertLead.mockResolvedValue(result);
    const onConverted = jest.fn();

    render(<LeadConvertCard lead={lead} onConverted={onConverted} onOpenCustomer={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Deal amount (optional)'), '25000');
    fireEvent.press(screen.getByRole('button', { name: 'Convert lead' }));

    await waitFor(() => expect(onConverted).toHaveBeenCalledWith(result));
    expect(mockConvertLead).toHaveBeenCalledWith('l1', { createDeal: true, deal: { amount: 25000 } });
  });

  it('shows the server error (e.g. EMPLOYEE not allowed)', async () => {
    const config = { headers: new AxiosHeaders() };
    mockConvertLead.mockRejectedValue(
      new AxiosError('Forbidden', '403', config, null, {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
        data: { error: 'You do not have permission to do this' },
      }),
    );

    render(<LeadConvertCard lead={lead} onConverted={jest.fn()} onOpenCustomer={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: 'Convert lead' }));

    expect(await screen.findByText('You do not have permission to do this')).toBeTruthy();
  });

  it('offers to open the customer once converted', () => {
    const onOpenCustomer = jest.fn();
    render(
      <LeadConvertCard
        lead={{ ...lead, status: 'CONVERTED', customerId: 'c9', customer: { id: 'c9', name: 'Acme Ltd' } }}
        onConverted={jest.fn()}
        onOpenCustomer={onOpenCustomer}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Open Acme Ltd' }));
    expect(onOpenCustomer).toHaveBeenCalledWith('c9', 'Acme Ltd');
  });

  it('is hidden for lost leads', () => {
    render(<LeadConvertCard lead={{ ...lead, status: 'LOST' }} onConverted={jest.fn()} onOpenCustomer={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Convert lead' })).toBeNull();
  });
});

describe('TeamForm', () => {
  const users = [
    { id: 'o', name: 'Olivia', role: 'OWNER' },
    { id: 'm', name: 'Mia', role: 'MANAGER' },
    { id: 's1', name: 'Sam', role: 'SALES' },
    { id: 's2', name: 'Sara', role: 'SALES' },
  ] as TeamUser[];

  it('validates the name and submits manager and members', () => {
    const onSubmit = jest.fn();
    render(<TeamForm team={null} users={users} saving={false} error={null} onSubmit={onSubmit} onCancel={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: 'Create team' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 2 characters')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Team name'), 'North');
    fireEvent.press(screen.getByRole('radio', { name: 'Mia · manager' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Sam · sales' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Sara · sales' }));
    fireEvent.press(screen.getByRole('button', { name: 'Create team' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'North', territory: null, managerId: 'm', memberIds: ['s1', 's2'] });
  });

  it('only offers MANAGER/ADMIN users as managers and never the OWNER as a member', () => {
    render(<TeamForm team={null} users={users} saving={false} error={null} onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByLabelText('Sam · sales', { exact: true })).toBeTruthy();
    expect(screen.queryByLabelText('Olivia · owner')).toBeNull();
    expect(screen.getAllByRole('radio').map(r => r.props.accessibilityLabel)).toEqual(['No manager', 'Mia · manager']);
  });
});
