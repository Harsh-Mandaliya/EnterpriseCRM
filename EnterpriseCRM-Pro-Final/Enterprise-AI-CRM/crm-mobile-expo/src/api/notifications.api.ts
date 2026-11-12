import { apiClient } from '@/api/client';
import type { AppNotification } from '@/types';

export async function listNotifications(unreadOnly?: boolean): Promise<AppNotification[]> {
  const { data } = await apiClient.get<AppNotification[]>('/notifications', {
    params: unreadOnly ? { unreadOnly: 'true' } : undefined,
  });
  return data;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const { data } = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
