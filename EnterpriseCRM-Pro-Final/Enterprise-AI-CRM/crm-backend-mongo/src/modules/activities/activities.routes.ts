import {
  Router,
  Response,
  NextFunction,
} from 'express';

import * as activitiesController from '@/modules/activities/activities.controller';

import {
  requireAuth,
  AuthedRequest,
} from '@/middlewares/auth.middleware';

import { validate } from '@/middlewares/validate.middleware';

import {
  createActivitySchema,
  updateActivitySchema,
} from '@/modules/activities/activities.validation';

import {
  CAN_MANAGE_ACTIVITIES,
} from '@/utils/permissions';

const router = Router();

/* ============================================================
   ROLE MIDDLEWARE
   ============================================================ */

/**
 * Only roles listed in CAN_MANAGE_ACTIVITIES can
 * edit or delete activities.
 *
 * Authentication is already handled by requireAuth.
 */
function requireActivityManager(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const role = req.user?.role;

  if (
    !role ||
    !CAN_MANAGE_ACTIVITIES.includes(role)
  ) {
    return res.status(403).json({
      success: false,
      message:
        'You do not have permission to modify or delete activities.',
    });
  }

  return next();
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

router.use(requireAuth);

/* ============================================================
   LIST ACTIVITIES
   ------------------------------------------------------------
   All authenticated roles can view activities.
   ============================================================ */

router.get(
  '/',
  activitiesController.list,
);

/* ============================================================
   CREATE ACTIVITY
   ------------------------------------------------------------
   All authenticated roles can create activities.
   ============================================================ */

router.post(
  '/',
  validate(createActivitySchema),
  activitiesController.create,
);

/* ============================================================
   COMPLETE ACTIVITY
   ------------------------------------------------------------
   All authenticated roles can complete activities.
   ============================================================

   Backend determines:

     completedById = authenticated user ID
     completedAt   = server timestamp
     status        = COMPLETED

   The frontend cannot provide these values.
   ============================================================ */

router.patch(
  '/:id/complete',
  activitiesController.complete,
);

/* ============================================================
   UPDATE ACTIVITY
   ------------------------------------------------------------
   Only roles in CAN_MANAGE_ACTIVITIES can update.

   Current permission:
     OWNER
     ADMIN
   ============================================================ */

router.patch(
  '/:id',
  requireActivityManager,
  validate(updateActivitySchema),
  activitiesController.update,
);

/* ============================================================
   DELETE ACTIVITY
   ------------------------------------------------------------
   Only roles in CAN_MANAGE_ACTIVITIES can delete.

   Current permission:
     OWNER
     ADMIN
   ============================================================ */

router.delete(
  '/:id',
  requireActivityManager,
  activitiesController.remove,
);

/* ============================================================
   EXPORT
   ============================================================ */

export default router;