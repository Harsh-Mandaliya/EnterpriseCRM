import { Router } from 'express';
import * as leadsController from '@/modules/leads/leads.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  convertLeadSchema,
  duplicatesQuerySchema,
} from '@/modules/leads/leads.validation';
import { CAN_EXPORT_DATA, CAN_IMPORT_DATA, CAN_MANAGE_BUSINESS_DATA } from '@/utils/permissions';
import * as csvController from '@/modules/csv/csv.controller';
import { importSchema } from '@/modules/csv/csv.controller';

const router = Router();

router.use(requireAuth);

router.get('/', leadsController.list);
router.get('/duplicates', validate(duplicatesQuerySchema), leadsController.duplicates);
router.get('/export', requireRole(...CAN_EXPORT_DATA), csvController.exportLeads);
router.post('/import', requireRole(...CAN_IMPORT_DATA), validate(importSchema), csvController.importLeads);
router.get('/:id', leadsController.getOne);
router.post('/', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(createLeadSchema), leadsController.create);
router.patch('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateLeadSchema), leadsController.update);
router.patch('/:id/status', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateLeadStatusSchema), leadsController.updateStatus);
router.post('/:id/convert', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(convertLeadSchema), leadsController.convert);
router.delete('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), leadsController.remove);

export default router;
