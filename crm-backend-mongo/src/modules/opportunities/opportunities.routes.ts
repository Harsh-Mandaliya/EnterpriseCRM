import { Router } from 'express';
import * as oppController from '@/modules/opportunities/opportunities.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateStageSchema,
} from '@/modules/opportunities/opportunities.validation';
import { CAN_MANAGE_BUSINESS_DATA } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

router.get('/', oppController.list);
router.get('/:id', oppController.getOne);
router.post('/', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(createOpportunitySchema), oppController.create);
router.patch('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateOpportunitySchema), oppController.update);
router.patch('/:id/stage', requireRole(...CAN_MANAGE_BUSINESS_DATA), validate(updateStageSchema), oppController.updateStage);
router.delete('/:id', requireRole(...CAN_MANAGE_BUSINESS_DATA), oppController.remove);

export default router;
