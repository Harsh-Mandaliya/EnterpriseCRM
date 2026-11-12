import {
  Response,
  NextFunction,
} from 'express';

import { AuthedRequest } from '@/middlewares/auth.middleware';

import * as activitiesService from '@/modules/activities/activities.service';
import { activityScope } from '@/utils/scope';
import { track } from '@/utils/track';

/* ============================================================
   LIST ACTIVITIES
   ============================================================ */

export async function list(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const {
      customerId,
      leadId,
      opportunityId,
    } = req.query as Record<string, string>;

    const activities =
      await activitiesService.listActivities(
        req.user!.companyId,
        {
          customerId,
          leadId,
          opportunityId,
        },
        await activityScope(req.user!),
      );

    res.json(activities);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   CREATE ACTIVITY
   ============================================================ */

export async function create(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const activity =
      await activitiesService.createActivity(
        req.user!.companyId,
        req.user!.userId,
        req.body,
      );

    await track(req.user!, 'task.created', 'Activity', { id: activity.id, label: activity.summary }, { type: activity.type, assignedToId: activity.assignedToId ? String(activity.assignedToId) : null });

    res
      .status(201)
      .json(activity);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   COMPLETE ACTIVITY
   ------------------------------------------------------------
   IMPORTANT:
   completedById and completedAt are NOT received from the
   frontend.

   The authenticated user comes from the JWT:
       req.user!.userId

   The service should set:
       status = COMPLETED
       completedById = req.user!.userId
       completedAt = new Date()
   ============================================================ */

export async function complete(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const activity =
      await activitiesService.completeActivity(
        req.user!.companyId,
        req.params.id,
        req.user!.userId,
        await activityScope(req.user!),
      );

    await track(req.user!, 'task.completed', 'Activity', { id: activity.id, label: activity.summary }, { type: activity.type });

    res.json(activity);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   UPDATE ACTIVITY
   ------------------------------------------------------------
   OWNER / ADMIN permission should be enforced by the route
   middleware and/or service layer.

   Completion should NOT be performed through this endpoint.
   Use /:id/complete instead.
   ============================================================ */

export async function update(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const activity =
      await activitiesService.updateActivity(
        req.user!.companyId,
        req.params.id,
        req.body,
      );

    res.json(activity);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   DELETE ACTIVITY
   ------------------------------------------------------------
   OWNER / ADMIN permission should be enforced by the route
   middleware and/or service layer.
   ============================================================ */

export async function remove(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await activitiesService.deleteActivity(
      req.user!.companyId,
      req.params.id,
    );

    res
      .status(204)
      .send();
  } catch (err) {
    next(err);
  }
}