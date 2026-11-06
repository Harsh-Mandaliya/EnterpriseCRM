import { z } from 'zod';

import { objectId } from '@/utils/objectId';

/* ============================================================
   ACTIVITY TYPE
   ============================================================ */

const activityType = z.enum([
  'CALL',
  'EMAIL',
  'MEETING',
  'TASK',
  'NOTE',
]);

/* ============================================================
   CREATE ACTIVITY
   ============================================================ */

export const createActivitySchema = z.object({
  body: z.object({
    type: activityType.default('NOTE'),

    summary: z
      .string()
      .trim()
      .min(1, 'Activity summary is required'),

    notes: z
      .string()
      .trim()
      .optional(),

    customerId:
      objectId.optional(),

    leadId:
      objectId.optional(),

    opportunityId:
      objectId.optional(),

    assignedToId:
      objectId.optional(),

    dueAt:
      z
        .string()
        .datetime()
        .optional(),
  }),
});

/* ============================================================
   UPDATE ACTIVITY
   ------------------------------------------------------------
   IMPORTANT:
   These fields are intentionally NOT accepted here:
   
   ❌ status
   ❌ completedAt
   ❌ completedById

   Completion must happen through:

       PATCH /activities/:id/complete

   The backend then determines:
       status
       completedAt
       completedById
   ============================================================ */

export const updateActivitySchema = z.object({
  body: z.object({
    type:
      activityType.optional(),

    summary:
      z
        .string()
        .trim()
        .min(
          1,
          'Activity summary is required',
        )
        .optional(),

    notes:
      z
        .string()
        .trim()
        .optional(),

    dueAt:
      z
        .string()
        .datetime()
        .nullable()
        .optional(),

    customerId:
      objectId
        .nullable()
        .optional(),

    leadId:
      objectId
        .nullable()
        .optional(),

    opportunityId:
      objectId
        .nullable()
        .optional(),

    assignedToId:
      objectId
        .nullable()
        .optional(),
  }),
});