import { Router } from 'express';
import * as productsController from '@/modules/products/products.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createProductSchema, updateProductSchema } from '@/modules/products/products.validation';
import { CAN_MANAGE_BUSINESS_DATA } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

router.get('/', productsController.list);
router.get('/:id', productsController.getOne);
router.post('/', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(createProductSchema), productsController.create);
router.patch('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateProductSchema), productsController.update);
router.delete('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), productsController.remove);

export default router;
