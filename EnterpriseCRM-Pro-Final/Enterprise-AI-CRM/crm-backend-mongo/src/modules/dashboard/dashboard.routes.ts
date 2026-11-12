import { Router } from 'express';

import * as dashboardController from '@/modules/dashboard/dashboard.controller';

import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { DASHBOARD_ACCESS } from '@/utils/permissions';

const router = Router();

/* ============================================================
   AUTHENTICATION
============================================================ */

router.use(requireAuth);

/* ============================================================
   OWNER / COMPANY DASHBOARD
   GET /api/v1/dashboard/summary
============================================================ */

router.get(
  '/summary',
  requireRole(...DASHBOARD_ACCESS.summary),
  dashboardController.summary,
);

/* ============================================================
   MANAGER DASHBOARD
   GET /api/v1/dashboard/manager-summary
============================================================ */

router.get(
  '/manager-summary',
  requireRole(...DASHBOARD_ACCESS.manager),
  dashboardController.managerSummary,
);

/* ============================================================
   SALES DASHBOARD
   GET /api/v1/dashboard/sales-summary
============================================================ */

router.get(
  '/sales-summary',
  requireRole(...DASHBOARD_ACCESS.sales),
  dashboardController.salesSummary,
);

/* ============================================================
   EMPLOYEE DASHBOARD
============================================================ */

router.get(
  '/employee-summary',
  requireRole(...DASHBOARD_ACCESS.employee),
  dashboardController.employeeSummary,
);


/* ============================================================
   ADMIN DASHBOARD
============================================================ */
router.get(
  '/admin-summary',
  requireRole(...DASHBOARD_ACCESS.admin),
  dashboardController.adminSummary,
);

export default router;