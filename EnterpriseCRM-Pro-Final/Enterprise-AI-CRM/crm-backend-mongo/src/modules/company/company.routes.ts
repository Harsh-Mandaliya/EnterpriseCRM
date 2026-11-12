import { Router } from 'express';
import * as companyController from '@/modules/company/company.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { rateLimit } from '@/middlewares/security.middleware';
import {
  publicBrandingSchema,
  updateBrandingSchema,
  updateCompanyProfileSchema,
  updatePreferencesSchema,
} from '@/modules/company/company.validation';
import { CAN_MANAGE_BRANDING } from '@/utils/permissions';

const router = Router();

/* Public: login screen looks up a company's look by its code. */
router.get(
  '/public/:slug',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validate(publicBrandingSchema),
  companyController.publicBranding,
);

router.use(requireAuth);

/* Branding + resolved theme for the signed-in user. */
router.get('/branding', companyController.getBranding);
router.patch('/branding', requireRole(...CAN_MANAGE_BRANDING), validate(updateBrandingSchema), companyController.updateBranding);

/* Company profile (name, code, time zone, locale, currency). */
router.patch('/profile', requireRole('OWNER'), validate(updateCompanyProfileSchema), companyController.updateProfile);

/* Personal appearance (any role). */
router.patch('/preferences', validate(updatePreferencesSchema), companyController.updatePreferences);

export default router;
