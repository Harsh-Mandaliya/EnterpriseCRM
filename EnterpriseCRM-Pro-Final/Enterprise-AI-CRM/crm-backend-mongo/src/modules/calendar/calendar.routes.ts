import { Router } from 'express';
import * as calendarController from '@/modules/calendar/calendar.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createEventSchema, updateEventSchema } from '@/modules/calendar/calendar.validation';

const router = Router();

router.use(requireAuth);

// Calendar events are personal/team scheduling — every role can create and
// manage their own, same treatment as Activities/Tasks.
router.get('/', calendarController.list);
router.post('/', validate(createEventSchema), calendarController.create);
router.patch('/:id', validate(updateEventSchema), calendarController.update);
router.delete('/:id', calendarController.remove);

export default router;
