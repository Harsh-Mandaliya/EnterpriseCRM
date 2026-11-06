import { z } from 'zod';
import { objectId } from '@/utils/objectId';

const lineItemSchema = z.object({
  productId: objectId.optional(),
  description: z.string().trim().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    customerId: objectId,
    lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
    taxRate: z.number().min(0).max(100).optional(),
    dueDate: z.string(),
    notes: z.string().trim().optional(),
  }),
});

export const updateInvoiceSchema = z.object({
  body: z.object({
    customerId: objectId.optional(),
    lineItems: z.array(lineItemSchema).min(1).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    dueDate: z.string().optional(),
    notes: z.string().trim().optional(),
  }),
});

export const updateInvoiceStatusSchema = z.object({
  body: z.object({
    status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']),
  }),
});
