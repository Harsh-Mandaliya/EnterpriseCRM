import { Response, NextFunction } from 'express';
import { track } from '@/utils/track';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as calendarService from '@/modules/calendar/calendar.service';
import { eventVisibilityScope, scopeFor } from '@/utils/scope';

const scopeOf = (req: AuthedRequest) => scopeFor(req.user!, 'createdById');

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const events = await calendarService.listEvents(req.user!.companyId, { from, to }, await eventVisibilityScope(req.user!));
    res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const event = await calendarService.createEvent(req.user!.companyId, req.user!.userId, req.body);
    const ev = event as { id?: string; title?: string; type?: string };
    await track(req.user!, 'event.created', 'CalendarEvent', { id: ev.id, label: ev.title }, { type: ev.type });
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const event = await calendarService.updateEvent(req.user!.companyId, req.params.id, req.body, await scopeOf(req));
    res.json(event);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await calendarService.deleteEvent(req.user!.companyId, req.params.id, await scopeOf(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
