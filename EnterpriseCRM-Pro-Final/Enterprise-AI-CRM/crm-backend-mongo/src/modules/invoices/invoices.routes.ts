import { Router } from 'express';
import * as invoicesController from '@/modules/invoices/invoices.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from '@/modules/invoices/invoices.validation';
import { CAN_MANAGE_BUSINESS_DATA } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

router.get('/', invoicesController.list);
router.get('/:id', invoicesController.getOne);
router.post('/', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(createInvoiceSchema), invoicesController.create);
router.patch('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateInvoiceSchema), invoicesController.update);
router.patch('/:id/status', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateInvoiceStatusSchema), invoicesController.updateStatus);
router.delete('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), invoicesController.remove);

export default router;
