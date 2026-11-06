import { z } from 'zod';
import { ROLES } from '@/utils/permissions';

// Owners are only ever created through company registration — inviting or
// updating a teammate can never grant OWNER, so it's deliberately excluded
// from the assignable role set here even though the User model allows it.
const assignableRoles = ['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'] as const satisfies readonly (typeof ROLES)[number][];

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, 'Needs an uppercase letter')
      .regex(/[0-9]/, 'Needs a number'),
    role: z.enum(assignableRoles).default('SALES'),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.enum(assignableRoles).optional(),
    isActive: z.boolean().optional(),
  }),
});
