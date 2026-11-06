import { z } from 'zod';
import { objectId } from '@/utils/objectId';

/* ============================================================
   SHARED FIELDS
============================================================ */

const customerFields = {
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must contain at least 2 characters')
    .max(200, 'Customer name is too long'),

  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(254)
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .trim()
    .max(30, 'Phone number is too long')
    .optional()
    .or(z.literal('')),

  gstin: z
    .string()
    .trim()
    .max(15, 'GSTIN cannot exceed 15 characters')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .trim()
    .max(500, 'Address is too long')
    .optional()
    .or(z.literal('')),

  notes: z
    .string()
    .trim()
    .max(2000, 'Notes are too long')
    .optional()
    .or(z.literal('')),

  ownerId: objectId.nullable().optional(),

  sharedWithIds: z.array(objectId).max(50).optional(),

  /** Save even if a lead/customer with the same e-mail or phone exists. */
  allowDuplicate: z.boolean().optional(),
};

/* ============================================================
   CREATE
============================================================ */

export const createCustomerSchema =
  z.object({
    body: z.object({
      name: customerFields.name,

      email: customerFields.email,

      phone: customerFields.phone,

      gstin: customerFields.gstin,

      address: customerFields.address,

      notes: customerFields.notes,
      ownerId: customerFields.ownerId,
      sharedWithIds: customerFields.sharedWithIds,
      allowDuplicate: customerFields.allowDuplicate,
    }),
  });

/* ============================================================
   UPDATE
============================================================ */

export const updateCustomerSchema =
  z.object({
    body: z
      .object({
        name: customerFields.name.optional(),

        email: customerFields.email,

        phone: customerFields.phone,

        gstin: customerFields.gstin,

        address: customerFields.address,

        notes: customerFields.notes,
        ownerId: customerFields.ownerId,
        sharedWithIds: customerFields.sharedWithIds,
        allowDuplicate: customerFields.allowDuplicate,
      })
      .refine(
        value =>
          Object.keys(value).length > 0,
        {
          message:
            'At least one field is required',
        },
      ),
  });