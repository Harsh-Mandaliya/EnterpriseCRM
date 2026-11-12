import { Router } from 'express';
import * as paymentsController from '@/modules/payments/payments.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createPaymentSchema } from '@/modules/payments/payments.validation';
import { CAN_MANAGE_BUSINESS_DATA } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

router.get('/', paymentsController.list);
router.get('/invoice/:invoiceId/summary', paymentsController.invoiceSummary);
router.post('/', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(createPaymentSchema), paymentsController.create);

export default router;
