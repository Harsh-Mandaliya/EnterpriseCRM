import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({}), useFocusEffect: () => undefined }));

import { assigneeLabel, bucketOf, completionTiming, filterTasks } from '@/screens/activities/ActivitiesScreen';
import { GENERAL } from '@/screens/forms/TaskFormScreen';
import { shortAddress } from '@/screens/customers/CustomerListScreen';
import type { Activity } from '@/types';

/* v1.4.2 — tasks for a person or the whole team, completion record;
   customer list helpers. */

const now = new Date(2026, 10, 13, 12, 0);
const task = (over: Partial<Activity>): Activity =>
  ({
    id: 't',
    type: 'TASK',
    status: 'PENDING',
    summary: 'Call Acme',
    notes: null,
    dueAt: null,
    completedAt: null,
    completedById: null,
    completedBy: null,
    customerId: null,
    leadId: null,
    opportunityId: null,
    assignedToId: 'u1',
    assignedTo: { id: 'u1', name: 'Ritik Shah' },
    createdById: 'u9',
    createdBy: { id: 'u9', name: 'Pari Mehta' },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  }) as Activity;

describe('tasks', () => {
  it('groups by due date', () => {
    expect(bucketOf(task({ dueAt: new Date(2026, 10, 12, 9).toISOString() }), now)).toBe('overdue');
    expect(bucketOf(task({ dueAt: new Date(2026, 10, 13, 18).toISOString() }), now)).toBe('today');
    expect(bucketOf(task({ dueAt: new Date(2026, 10, 15).toISOString() }), now)).toBe('upcoming');
    expect(bucketOf(task({}), now)).toBe('nodate');
    expect(bucketOf(task({ status: 'COMPLETED' }), now)).toBe('done');
  });

  it('says whether a task was done on time', () => {
    expect(completionTiming(task({ dueAt: '2026-11-10T10:00:00', completedAt: '2026-11-10T18:00:00' }))).toBe('on time');
    expect(completionTiming(task({ dueAt: '2026-11-10T10:00:00', completedAt: '2026-11-12T09:00:00' }))).toBe('2 days late');
    expect(completionTiming(task({ completedAt: '2026-11-12T09:00:00' }))).toBeNull();
  });

  it('labels the assignee: you, a person or the whole team', () => {
    expect(assigneeLabel(task({}), 'u1')).toBe('You');
    expect(assigneeLabel(task({}), 'u2')).toBe('Ritik Shah');
    expect(assigneeLabel(task({ assignedToId: null, assignedTo: null }), 'u2')).toBe('General (team)');
    expect(GENERAL).toBe('__general__');
  });

  it('filters by status, person and search; notes are not tasks', () => {
    const list = [
      task({ id: 'mine', assignedToId: 'u1', dueAt: '2026-11-20T00:00:00Z' }),
      task({ id: 'general', assignedToId: null, assignedTo: null, summary: 'Restock samples', dueAt: '2026-11-14T00:00:00Z' }),
      task({ id: 'created', assignedToId: 'u2', assignedTo: { id: 'u2', name: 'Neha' }, createdById: 'u1' }),
      task({ id: 'done', status: 'COMPLETED', completedAt: '2026-11-12T10:00:00Z' }),
      task({ id: 'note', type: 'NOTE' }),
    ];
    expect(filterTasks(list, 'open', 'all', '', 'u1').map(t => t.id)).toEqual(['general', 'mine', 'created']);
    expect(filterTasks(list, 'open', 'mine', '', 'u1').map(t => t.id)).toEqual(['mine']);
    expect(filterTasks(list, 'open', 'general', '', 'u1').map(t => t.id)).toEqual(['general']);
    expect(filterTasks(list, 'open', 'created', '', 'u1').map(t => t.id)).toEqual(['created']);
    expect(filterTasks(list, 'done', 'all', '', 'u1').map(t => t.id)).toEqual(['done']);
    expect(filterTasks(list, 'all', 'all', 'neha', 'u1').map(t => t.id)).toEqual(['created']);
  });
});

describe('customer list', () => {
  it('shortens an address to city and state', () => {
    expect(shortAddress('Ring Road, Surat, Gujarat 395002')).toBe('Surat, Gujarat');
    expect(shortAddress('Pune')).toBe('Pune');
    expect(shortAddress(null)).toBeNull();
  });
});

import { webApiUrl } from '@/api/client';

describe('web API address', () => {
  it('uses the page host for local / LAN backends so the browser does not block it', () => {
    expect(webApiUrl('http://192.168.31.66:4000/api/v1', 'localhost')).toBe('http://localhost:4000/api/v1');
    expect(webApiUrl('http://192.168.31.66:4000/api/v1', '192.168.31.66')).toBe('http://192.168.31.66:4000/api/v1');
    expect(webApiUrl('http://192.168.31.66:4000/api/v1', '127.0.0.1')).toBe('http://127.0.0.1:4000/api/v1');
  });
  it('leaves public APIs and public pages alone', () => {
    expect(webApiUrl('https://api.example.com/api/v1', 'localhost')).toBe('https://api.example.com/api/v1');
    expect(webApiUrl('http://192.168.31.66:4000/api/v1', 'crm.example.com')).toBe('http://192.168.31.66:4000/api/v1');
    expect(webApiUrl('http://192.168.31.66:4000/api/v1', undefined)).toBe('http://192.168.31.66:4000/api/v1');
  });
});
