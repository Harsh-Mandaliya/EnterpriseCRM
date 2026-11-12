import { Router } from 'express';

import * as aiController from '@/modules/ai/ai.controller';

import { requireAuth } from '@/middlewares/auth.middleware';

import { requireRole } from '@/middlewares/rbac.middleware';

import { CAN_VIEW_REPORTS } from '@/utils/permissions';

const router = Router();

/* ============================================================
   AUTHENTICATION
   All AI routes require a logged-in user.
============================================================ */

router.use(requireAuth);

/* ============================================================
   NEXT BEST ACTIONS
   Personal AI recommendations.

   Every authenticated role can access this endpoint because
   it only returns the requesting user's own tasks/leads.
============================================================ */

router.get(
  '/next-best-actions',
  aiController.nextBestActions,
);

/* ============================================================
   LEAD SCORES
   Company-wide AI lead scoring.

   Access:
   OWNER
   ADMIN
   MANAGER
============================================================ */

router.get(
  '/lead-scores',
  requireRole(...CAN_VIEW_REPORTS),
  aiController.leadScores,
);

/* ============================================================
   SALES FORECAST
   Company-wide AI sales forecasting.

   Access:
   OWNER
   ADMIN
   MANAGER
============================================================ */

router.get(
  '/sales-forecast',
  requireRole(...CAN_VIEW_REPORTS),
  aiController.salesForecast,
);

/* ============================================================
   CUSTOMER INSIGHTS
   Company-wide AI customer risk/insight analysis.

   Access:
   OWNER
   ADMIN
   MANAGER
============================================================ */

router.get(
  '/customer-insights',
  requireRole(...CAN_VIEW_REPORTS),
  aiController.customerInsights,
);

/* ============================================================
   EXPORT
============================================================ */

export default router;