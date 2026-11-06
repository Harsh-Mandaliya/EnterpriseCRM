import { objectId } from '@/utils/objectId';
import { z } from 'zod';

const stage = z.enum([
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
]);

export const createOpportunitySchema = z.object({
  body: z.object({
    title: z.string().trim().min(1),
    amount: z.number().nonnegative().default(0),
    stage: stage.default('PROSPECTING'),
    customerId: objectId.optional(),
    leadId: objectId.optional(),
    ownerId: objectId.optional(),
    closeDate: z.string().datetime().optional(),
  }),
});

export const updateOpportunitySchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).optional(),
    amount: z.number().nonnegative().optional(),
    stage: stage.optional(),
    customerId: objectId.nullable().optional(),
    leadId: objectId.nullable().optional(),
    ownerId: objectId.nullable().optional(),
    closeDate: z.string().datetime().nullable().optional(),
  }),
});

export const updateStageSchema = z.object({
  body: z.object({ stage }),
});
