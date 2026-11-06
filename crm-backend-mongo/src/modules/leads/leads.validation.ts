import { objectId } from '@/utils/objectId';
import { z } from 'zod';

const leadSource = z.enum([
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'SOCIAL_MEDIA',
  'EVENT',
  'OTHER',
]);
const leadStatus = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'CONVERTED',
  'LOST',
]);

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    source: leadSource.default('OTHER'),
    customerId: objectId.optional(),
    assignedToId: objectId.optional(),
    /** Save even if a lead/customer with the same e-mail or phone exists. */
    allowDuplicate: z.boolean().optional(),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    source: leadSource.optional(),
    status: leadStatus.optional(),
    score: z.number().int().min(0).max(100).optional(),
    assignedToId: objectId.nullable().optional(),
    allowDuplicate: z.boolean().optional(),
  }),
});

export const updateLeadStatusSchema = z.object({
  body: z.object({
    status: leadStatus,
  }),
});

export const convertLeadSchema = z.object({
  body: z
    .object({
      customerId: objectId.optional(),
      createDeal: z.boolean().optional(),
      deal: z
        .object({
          title: z.string().trim().min(1).max(200).optional(),
          amount: z.number().nonnegative().max(1e12).optional(),
          closeDate: z.string().datetime().optional(),
          stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION']).optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

export const duplicatesQuerySchema = z.object({
  query: z.object({
    email: z.string().trim().max(254).optional(),
    phone: z.string().trim().max(30).optional(),
    excludeId: objectId.optional(),
  }),
});
