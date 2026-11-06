import { Router } from 'express';
import * as usersController from '@/modules/users/users.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from '@/modules/users/users.validation';
import { CAN_MANAGE_TEAM } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

router.get('/', usersController.list);
router.get('/:id', usersController.getOne);
// Only owners/admins can manage team members.
router.post('/', requireRole(...CAN_MANAGE_TEAM), validate(createUserSchema), usersController.create);
router.patch('/:id', requireRole(...CAN_MANAGE_TEAM), validate(updateUserSchema), usersController.update);
router.delete('/:id', requireRole(...CAN_MANAGE_TEAM), usersController.remove);

export default router;
