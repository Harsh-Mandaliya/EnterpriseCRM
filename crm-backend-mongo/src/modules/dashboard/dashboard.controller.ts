import { Response, NextFunction } from 'express';

import { AuthedRequest } from '@/middlewares/auth.middleware';

import * as dashboardService from '@/modules/dashboard/dashboard.service';
import { visibleUserIds } from '@/utils/scope';
import { Types } from 'mongoose';

/* ============================================================
   OWNER DASHBOARD
============================================================ */

export async function summary(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data =
      await dashboardService.getSummary(
        req.user!.companyId,
      );

    res.json(data);
  } catch (error) {
    next(error);
  }
}

/* ============================================================
   MANAGER DASHBOARD
============================================================ */

export async function managerSummary(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data =
      await dashboardService.getManagerSummary(
        req.user!.companyId,
        req.user!.userId,
        // Team managers: their members' figures. Otherwise (no team,
        // or OWNER/ADMIN opening this view) the caller's own.
        req.user!.role === 'MANAGER'
          ? (await visibleUserIds(req.user!)) ?? [new Types.ObjectId(req.user!.userId)]
          : [new Types.ObjectId(req.user!.userId)],
      );

    res.json(data);
  } catch (error) {
    next(error);
  }
}

/* ============================================================
   SALES DASHBOARD
============================================================ */

export async function salesSummary(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data =
      await dashboardService.getSalesSummary(
        req.user!.companyId,
        req.user!.userId,
      );

    res.json(data);
  } catch (error) {
    next(error);
  }
}

/* ============================================================
   EMPLOYEE
============================================================ */

export async function employeeSummary(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {

    const data =
      await dashboardService.getEmployeeSummary(
        req.user!.companyId,
        req.user!.userId,
      );

    res.json(data);

  } catch (error) {

    next(error);

  }
}


/* ============================================================
   ADMIN
============================================================ */
export async function adminSummary(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {

  try {

    const data =
      await dashboardService.getAdminSummary(
        req.user!.companyId,
      );

    res.json(data);

  } catch (error) {

    next(error);

  }

}