import { Response, NextFunction } from 'express';
import { track } from '@/utils/track';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as oppService from '@/modules/opportunities/opportunities.service';
import { scopeFor } from '@/utils/scope';
import { seesEverything } from '@/utils/permissions';

const scopeOf = (req: AuthedRequest) => scopeFor(req.user!, 'ownerId');

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opportunities = await oppService.listOpportunities(req.user!.companyId, await scopeOf(req));
    res.json(opportunities);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opp = await oppService.getOpportunity(req.user!.companyId, req.params.id, await scopeOf(req));
    res.json(opp);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opp = await oppService.createOpportunity(req.user!.companyId, {
      ...req.body,
      // Same rule as leads: only OWNER/ADMIN may leave a deal unowned.
      ownerId:
        req.body.ownerId ?? (seesEverything(req.user!.role) ? undefined : req.user!.userId),
    });
    await track(req.user!, 'deal.created', 'Opportunity', { id: opp.id, label: opp.title }, { amount: opp.amount, stage: opp.stage });
    res.status(201).json(opp);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const before = req.body.stage ? await oppService.getOpportunity(req.user!.companyId, req.params.id, await scopeOf(req)) : null;
    const opp = await oppService.updateOpportunity(req.user!.companyId, req.params.id, req.body, await scopeOf(req));
    if (before && before.stage !== opp.stage) {
      await track(req.user!, 'deal.stage_changed', 'Opportunity', { id: opp.id, label: opp.title }, { from: before.stage, to: opp.stage, amount: opp.amount });
    }
    res.json(opp);
  } catch (err) {
    next(err);
  }
}

export async function updateStage(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const before = await oppService.getOpportunity(req.user!.companyId, req.params.id, await scopeOf(req));
    const opp = await oppService.updateOpportunity(
      req.user!.companyId,
      req.params.id,
      { stage: req.body.stage },
      await scopeOf(req),
    );
    if (before.stage !== opp.stage) {
      await track(req.user!, 'deal.stage_changed', 'Opportunity', { id: opp.id, label: opp.title }, { from: before.stage, to: opp.stage, amount: opp.amount });
    }
    res.json(opp);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await oppService.deleteOpportunity(req.user!.companyId, req.params.id, await scopeOf(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
