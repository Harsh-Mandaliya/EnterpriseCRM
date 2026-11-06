import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as reportsService from '@/modules/reports/reports.service';
import { invoiceScope, scopeFor } from '@/utils/scope';

export async function sales(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const report = await reportsService.getSalesReport(req.user!.companyId, months, await invoiceScope(req.user!));
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function leadConversion(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const report = await reportsService.getLeadConversionReport(req.user!.companyId, await scopeFor(req.user!, 'assignedToId'));
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function deals(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const report = await reportsService.getDealsReport(req.user!.companyId, await scopeFor(req.user!, 'ownerId'));
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function topCustomers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const report = await reportsService.getTopCustomersReport(req.user!.companyId, limit, await invoiceScope(req.user!));
    res.json(report);
  } catch (err) {
    next(err);
  }
}
