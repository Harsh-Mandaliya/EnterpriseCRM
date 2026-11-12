import { Response, NextFunction } from 'express';
import { track } from '@/utils/track';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as leadsService from '@/modules/leads/leads.service';
import { scopeFor } from '@/utils/scope';
import { seesEverything } from '@/utils/permissions';
import { assertNoDuplicates, findDuplicates } from '@/utils/duplicates';

const scopeOf = (req: AuthedRequest) => scopeFor(req.user!, 'assignedToId');

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const assignedToId =
      typeof req.query.assignedToId === 'string' ? req.query.assignedToId : undefined;
    const leads = await leadsService.listLeads(req.user!.companyId, { status, assignedToId }, await scopeOf(req));
    res.json(leads);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const lead = await leadsService.getLead(req.user!.companyId, req.params.id, await scopeOf(req));
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { allowDuplicate, ...body } = req.body;
    await assertNoDuplicates(req.user!, { email: body.email, phone: body.phone }, { allowDuplicate });
    req.body = body;
    const lead = await leadsService.createLead(req.user!.companyId, {
      ...req.body,
      // Without an explicit assignee the creator owns the lead. Only
      // OWNER/ADMIN may leave it unassigned: a team manager would
      // otherwise lose sight of a lead they just created.
      assignedToId:
        req.body.assignedToId ?? (seesEverything(req.user!.role) ? undefined : req.user!.userId),
    });
    await track(req.user!, 'lead.created', 'Lead', { id: lead.id, label: lead.name }, { source: lead.source });
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { allowDuplicate, ...body } = req.body;
    if (body.email !== undefined || body.phone !== undefined) {
      await assertNoDuplicates(
        req.user!,
        { email: body.email ?? null, phone: body.phone ?? null },
        { allowDuplicate, exclude: { type: 'lead', id: req.params.id } },
      );
    }
    req.body = body;
    const before = await leadsService.getLead(req.user!.companyId, req.params.id, await scopeOf(req));
    const lead = await leadsService.updateLead(req.user!.companyId, req.params.id, req.body, await scopeOf(req));
    await trackLeadChanges(req, before, lead);
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const before = await leadsService.getLead(req.user!.companyId, req.params.id, await scopeOf(req));
    const lead = await leadsService.updateLead(
      req.user!.companyId,
      req.params.id,
      { status: req.body.status },
      await scopeOf(req),
    );
    await trackLeadChanges(req, before, lead);
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await leadsService.deleteLead(req.user!.companyId, req.params.id, await scopeOf(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function convert(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const result = await leadsService.convertLead(req.user!, req.params.id, req.body, await scopeOf(req));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /leads/duplicates?email=&phone=&excludeId= — check before saving. */
export async function duplicates(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { email, phone, excludeId } = req.query as Record<string, string | undefined>;
    const matches = await findDuplicates(
      req.user!,
      { email, phone },
      excludeId ? { type: 'lead', id: excludeId } : null,
    );
    res.json({ duplicates: matches });
  } catch (err) {
    next(err);
  }
}

type LeadSnapshot = { id: string; name: string; status?: string; assignedTo?: { id: string; name: string } | null };

// Work log entries for status changes and reassignment.
async function trackLeadChanges(req: AuthedRequest, before: LeadSnapshot, after: LeadSnapshot) {
  if (before.status !== after.status) {
    await track(req.user!, 'lead.status_changed', 'Lead', { id: after.id, label: after.name }, { from: before.status, to: after.status });
  }
  if ((before.assignedTo?.id ?? null) !== (after.assignedTo?.id ?? null)) {
    await track(req.user!, 'lead.assigned', 'Lead', { id: after.id, label: after.name }, { to: after.assignedTo?.name ?? null });
  }
}
