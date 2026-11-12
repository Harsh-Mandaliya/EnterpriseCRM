import { z } from 'zod';
import { objectId } from '@/utils/objectId';

export const createPaymentSchema = z.object({
  body: z.object({
    invoiceId: objectId,
    amount: z.number().min(0.01),
    method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'OTHER']).optional(),
    reference: z.string().trim().optional(),
    paidAt: z.string().optional(),
  }),
});
