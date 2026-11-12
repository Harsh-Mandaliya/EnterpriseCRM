import { Router } from 'express';
import * as notificationsController from '@/modules/notifications/notifications.controller';
import * as insightsController from '@/modules/reports/insights.controller';
import { requireAuth } from '@/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', notificationsController.list);
// Computed alerts (overdue tasks/invoices/deals, stale leads, upcoming
// events) with the reason each matters; hierarchy-scoped.
router.get('/attention', insightsController.attention);
router.patch('/:id/read', notificationsController.markRead);
router.patch('/read-all', notificationsController.markAllRead);

export default router;
