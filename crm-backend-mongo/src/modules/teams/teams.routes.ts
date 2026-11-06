import { Router } from 'express';
import * as teamsController from '@/modules/teams/teams.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createTeamSchema, updateTeamSchema } from '@/modules/teams/teams.validation';
import { CAN_MANAGE_TEAM } from '@/utils/permissions';

const router = Router();

router.use(requireAuth);

router.get('/', teamsController.list);
router.get('/:id', teamsController.getOne);
router.post('/', requireRole(...CAN_MANAGE_TEAM), validate(createTeamSchema), teamsController.create);
router.patch('/:id', requireRole(...CAN_MANAGE_TEAM), validate(updateTeamSchema), teamsController.update);
router.delete('/:id', requireRole(...CAN_MANAGE_TEAM), teamsController.remove);

export default router;
