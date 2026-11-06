import { z } from 'zod';
import { objectId } from '@/utils/objectId';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1),
    type: z.enum(['MEETING', 'CALL', 'FOLLOW_UP', 'DEADLINE', 'OTHER']).optional(),
    startAt: z.string(),
    endAt: z.string(),
    location: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    customerId: objectId.optional(),
    leadId: objectId.optional(),
    opportunityId: objectId.optional(),
    attendeeIds: z.array(objectId).optional(),
  }),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).optional(),
    type: z.enum(['MEETING', 'CALL', 'FOLLOW_UP', 'DEADLINE', 'OTHER']).optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    location: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  }),
});
