import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as aiService from '@/modules/ai/ai.service';
import * as dealInsightsService from '@/modules/ai/dealInsights.service';
import { invoiceScope, scopeFor } from '@/utils/scope';

export async function leadScores(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const scores = await aiService.getLeadScores(req.user!.companyId, await scopeFor(req.user!, 'assignedToId'));
    res.json(scores);
  } catch (err) {
    next(err);
  }
}

export async function salesForecast(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const forecast = await aiService.getSalesForecast(req.user!.companyId, await invoiceScope(req.user!));
    res.json(forecast);
  } catch (err) {
    next(err);
  }
}

export async function nextBestActions(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const actions = await aiService.getNextBestActions(req.user!.companyId, req.user!.userId, {
      leads: await scopeFor(req.user!, 'assignedToId'),
      invoices: await invoiceScope(req.user!),
    });
    res.json(actions);
  } catch (err) {
    next(err);
  }
}

export async function customerInsights(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const insights = await aiService.getCustomerInsights(req.user!.companyId, {
      customers: await scopeFor(req.user!, ['ownerId', 'sharedWithIds']),
      invoices: await invoiceScope(req.user!),
    });
    res.json(insights);
  } catch (err) {
    next(err);
  }
}

/* v1.4 — open to every role, hierarchy-scoped inside. */

export async function dealInsights(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await dealInsightsService.dealInsights(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function briefing(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await dealInsightsService.briefing(req.user!));
  } catch (err) {
    next(err);
  }
}
