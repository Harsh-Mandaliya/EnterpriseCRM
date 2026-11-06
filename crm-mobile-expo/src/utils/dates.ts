/* ============================================================
   DATE HELPERS (local time, no extra dependency)
============================================================ */

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-04" in local time. */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "14:30" in local time. */
export function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses "YYYY-MM-DD" (+ optional "HH:MM") as local time; null if invalid. */
export function parseDateInput(date: string, time = '00:00'): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const result = new Date(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  if (
    result.getFullYear() !== +d[1] ||
    result.getMonth() !== +d[2] - 1 ||
    result.getDate() !== +d[3] ||
    +t[1] > 23 ||
    +t[2] > 59
  ) {
    return null;
  }
  return result;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** "Wed, 4 Nov" */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Today", "Tomorrow", "In 3 days", "2 days ago". */
export function relativeDay(date: Date, now = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(date) - start(now)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}
