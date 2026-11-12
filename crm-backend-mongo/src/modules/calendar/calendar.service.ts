import { CalendarEvent } from '@/models';
import { ApiError } from '@/utils/apiError';
import { assertSameCompanyRefs } from '@/utils/scope';

// Visibility follows the hierarchy (utils/scope.ts
// eventVisibilityScope): company events from OWNER/ADMIN, events
// created in the caller's scope and events they're invited to.
// SALES/EMPLOYEE may only change events they created.
type Scope = Record<string, unknown>;

async function assertEventRefs(companyId: string, input: Record<string, unknown>) {
  const attendeeIds = Array.isArray(input.attendeeIds) ? input.attendeeIds : [];
  await assertSameCompanyRefs(companyId, {
    customerId: input.customerId,
    leadId: input.leadId,
    opportunityId: input.opportunityId,
    userIds: attendeeIds,
  });
}
import { notify } from '@/modules/notifications/notifications.service';

const POPULATE = [
  { path: 'customerId', select: 'name' },
  { path: 'leadId', select: 'name' },
  { path: 'opportunityId', select: 'title' },
  { path: 'attendeeIds', select: 'name' },
];

export async function listEvents(
  companyId: string,
  params: { from?: string; to?: string },
  visibility: Scope = {},
) {
  const filter: Record<string, unknown> = { ...visibility, companyId };
  if (params.from || params.to) {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (params.from) range.$gte = new Date(params.from);
    if (params.to) range.$lte = new Date(params.to);
    if (Object.values(range).some(d => Number.isNaN(d.getTime()))) {
      throw ApiError.badRequest('Invalid date range');
    }
    filter.startAt = range;
  }
  const events = await CalendarEvent.find(filter).populate(POPULATE).sort({ startAt: 1 });
  return events.map(e => e.toJSON());
}

export async function createEvent(companyId: string, createdById: string, input: Record<string, unknown>) {
  await assertEventRefs(companyId, input);
  const event = await CalendarEvent.create({ ...input, companyId, createdById });
  await event.populate(POPULATE);
  const attendeeIds = Array.isArray(input.attendeeIds)
    ? input.attendeeIds.filter((id): id is string => typeof id === 'string')
    : [];
  await Promise.all(
    attendeeIds
      .filter(id => id !== createdById)
      .map(id =>
        notify(companyId, id, {
          type: 'MEETING',
          title: 'You were added to an event',
          message: event.title,
          relatedId: event._id.toString(),
        }),
      ),
  );
  return event.toJSON();
}

export async function updateEvent(
  companyId: string,
  id: string,
  input: Record<string, unknown>,
  scope: Scope = {},
) {
  await assertEventRefs(companyId, input);
  const existing = await CalendarEvent.findOne({ ...scope, _id: id, companyId });
  if (!existing) throw ApiError.notFound('Event not found');
  Object.assign(existing, input);
  await existing.save();
  await existing.populate(POPULATE);
  return existing.toJSON();
}

export async function deleteEvent(companyId: string, id: string, scope: Scope = {}) {
  const existing = await CalendarEvent.findOneAndDelete({ ...scope, _id: id, companyId });
  if (!existing) throw ApiError.notFound('Event not found');
}
