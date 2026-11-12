import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as notificationsService from '@/modules/notifications/notifications.service';

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await notificationsService.listForUser(req.user!.companyId, req.user!.userId, { unreadOnly });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const notification = await notificationsService.markRead(req.user!.companyId, req.user!.userId, req.params.id);
    res.json(notification);
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await notificationsService.markAllRead(req.user!.companyId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
