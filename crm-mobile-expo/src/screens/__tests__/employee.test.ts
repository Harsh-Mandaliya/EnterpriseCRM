import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { employeeStats } from '@/screens/dashboard/EmployeeDashboardScreen';
import type { Activity } from '@/types';

const now = new Date(2026, 10, 16, 10, 0); // Mon 16 Nov 2026, 10:00
const day = (offset: number, hour = 11) => new Date(2026, 10, 16 + offset, hour).toISOString();

let n = 0;
const task = (over: Partial<Activity>): Activity =>
  ({ id: `t${++n}`, type: 'TASK', status: 'PENDING', summary: 'x', dueAt: null, completedAt: null, completedById: null, assignedToId: 'me', createdById: 'boss', ...over }) as Activity;

const done = (due: number, finished: number, over: Partial<Activity> = {}) =>
  task({ status: 'COMPLETED', dueAt: day(due), completedAt: day(finished, 15), completedById: 'me', ...over });

describe('employeeStats', () => {
  const tasks = [
    task({ dueAt: day(0) }), // due today
    task({ dueAt: day(-2) }), // overdue
    task({ dueAt: day(3) }), // upcoming
    task({ assignedToId: null, dueAt: day(1) }), // open team task
    task({ assignedToId: 'someone-else', dueAt: day(-5) }), // not mine
    task({ type: 'NOTE' }), // notes are not work
    done(-3, -3), // on time
    done(-4, -2), // 2 days late
    done(-1, -1, { assignedToId: null }), // team task I completed, on time
    done(-2, -2, { assignedToId: 'someone-else', completedById: 'someone-else' }), // someone else's
    done(-30, -30), // on time, but older than the 7-day chart
  ];
  const s = employeeStats(tasks, 'me', now);

  it('counts only my open work', () => {
    expect(s.open).toBe(3);
    expect(s.dueToday).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.teamOpen).toBe(1);
  });

  it('scores what I completed, including team tasks I picked up', () => {
    expect(s.done).toBe(4);
    expect(s.onTime).toBe(3);
    expect(s.late).toBe(1);
    expect(s.onTimeRate).toBe(75);
  });

  it('charts the last 7 days, oldest first, ending today', () => {
    expect(s.week).toHaveLength(7);
    expect(s.week.map(d => d.value)).toEqual([0, 0, 0, 1, 1, 1, 0]);
    expect(s.doneThisWeek).toBe(3);
  });

  it('lists what to do next: mine and open team tasks, most urgent first', () => {
    expect(s.next.map(t => t.dueAt)).toEqual([day(-2), day(0), day(1), day(3)]);
  });

  it('has no on-time rate before anything is completed', () => {
    expect(employeeStats([task({})], 'me', now).onTimeRate).toBeNull();
  });
});
