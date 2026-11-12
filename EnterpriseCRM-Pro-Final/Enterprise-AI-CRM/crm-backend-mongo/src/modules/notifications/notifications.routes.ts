import { Router } from 'express';
import * as notificationsController from '@/modules/notifications/notifications.controller';
import { requireAuth } from '@/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', notificationsController.list);
router.patch('/:id/read', notificationsController.markRead);
router.patch('/read-all', notificationsController.markAllRead);

export default router;
