import { Router } from 'express';
import * as reportsController from '@/modules/reports/reports.controller';
import * as insightsController from '@/modules/reports/insights.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { CAN_VIEW_REPORTS } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

// Hierarchy-scoped insights (v1.4): open to every role because each
// one only covers what the caller may see (own / team / company).
router.get('/team-performance', insightsController.teamPerformance);
router.get('/work-log', insightsController.workLog);
router.get('/receivables', insightsController.receivables);

// Company-wide reports are restricted — SALES and EMPLOYEE see their own
// records throughout the app, but not aggregate company performance.
router.use(requireRole(...CAN_VIEW_REPORTS));

router.get('/sales', reportsController.sales);
router.get('/leads', reportsController.leadConversion);
router.get('/deals', reportsController.deals);
router.get('/top-customers', reportsController.topCustomers);

export default router;
