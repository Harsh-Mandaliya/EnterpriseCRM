import { Notification } from '@/models';
import type { NotificationType } from '@/models/Notification.model';
import { ApiError } from '@/utils/apiError';

/**
 * Called from other modules (leads, activities, payments, calendar) when a
 * real event happens that a specific user should know about — this is the
 * only way notifications get created; there's no synthetic/demo generator.
 */
export async function notify(
  companyId: string,
  userId: string,
  input: { type: NotificationType; title: string; message: string; relatedId?: string },
) {
  if (!userId) return;
  await Notification.create({ companyId, userId, ...input });
}

export async function listForUser(companyId: string, userId: string, params: { unreadOnly?: boolean }) {
  const filter: Record<string, unknown> = { companyId, userId };
  if (params.unreadOnly) filter.isRead = false;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  return notifications.map(n => n.toJSON());
}

export async function markRead(companyId: string, userId: string, id: string) {
  const existing = await Notification.findOne({ _id: id, companyId, userId });
  if (!existing) throw ApiError.notFound('Notification not found');
  existing.isRead = true;
  await existing.save();
  return existing.toJSON();
}

export async function markAllRead(companyId: string, userId: string) {
  await Notification.updateMany({ companyId, userId, isRead: false }, { isRead: true });
}
