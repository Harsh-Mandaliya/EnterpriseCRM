import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    sku: z.string().trim().optional(),
    category: z.string().trim().optional(),
    description: z.string().trim().optional(),
    price: z.number().min(0),
    stockQty: z.number().min(0).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    sku: z.string().trim().optional(),
    category: z.string().trim().optional(),
    description: z.string().trim().optional(),
    price: z.number().min(0).optional(),
    stockQty: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});
