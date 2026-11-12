import { Response, NextFunction } from 'express';

import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as insights from '@/modules/reports/insights.service';

type Handler = (req: AuthedRequest) => Promise<unknown>;

const wrap = (fn: Handler) => async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    next(err);
  }
};

export const teamPerformance = wrap(req => insights.teamPerformance(req.user!, req.query));
export const workLog = wrap(req => insights.workLog(req.user!, req.query));
export const receivables = wrap(req => insights.receivables(req.user!));
export const attention = wrap(req => insights.attention(req.user!));
