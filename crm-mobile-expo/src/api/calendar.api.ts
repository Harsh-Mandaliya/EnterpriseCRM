import { apiClient } from '@/api/client';
import type { CalendarEvent, CalendarEventType } from '@/types';

export async function listEvents(params?: { from?: string; to?: string }): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get<CalendarEvent[]>('/calendar', { params });
  return data;
}

export async function createEvent(input: {
  title: string;
  type?: CalendarEventType;
  startAt: string;
  endAt: string;
  location?: string;
  notes?: string;
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  attendeeIds?: string[];
}): Promise<CalendarEvent> {
  const { data } = await apiClient.post<CalendarEvent>('/calendar', input);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/calendar/${id}`);
}
