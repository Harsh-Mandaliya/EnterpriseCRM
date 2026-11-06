import { Router } from 'express';
import * as reportsController from '@/modules/reports/reports.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { CAN_VIEW_REPORTS } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);
// Company-wide reports are restricted — SALES and EMPLOYEE see their own
// records throughout the app, but not aggregate company performance.
router.use(requireRole(...CAN_VIEW_REPORTS));

router.get('/sales', reportsController.sales);
router.get('/leads', reportsController.leadConversion);
router.get('/deals', reportsController.deals);
router.get('/top-customers', reportsController.topCustomers);

export default router;
