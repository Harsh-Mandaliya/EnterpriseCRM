import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as oppService from '@/modules/opportunities/opportunities.service';
import { scopeFor } from '@/utils/scope';
import { hasCompanyWideVisibility } from '@/utils/permissions';

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
      ownerId:
        req.body.ownerId ??
        (hasCompanyWideVisibility(req.user!.role) ? undefined : req.user!.userId),
    });
    res.status(201).json(opp);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opp = await oppService.updateOpportunity(req.user!.companyId, req.params.id, req.body, await scopeOf(req));
    res.json(opp);
  } catch (err) {
    next(err);
  }
}

export async function updateStage(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opp = await oppService.updateOpportunity(
      req.user!.companyId,
      req.params.id,
      { stage: req.body.stage },
      await scopeOf(req),
    );
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
