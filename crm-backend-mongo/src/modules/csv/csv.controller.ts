import { Response, NextFunction } from 'express';
import { z } from 'zod';

import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as csvService from '@/modules/csv/csv.service';

/** POST body for imports. The 1 MB JSON limit caps the file size. */
export const importSchema = z.object({
  body: z
    .object({
      csv: z.string().min(1, 'csv is required').max(900_000, 'File is too large (max ~900 KB)'),
      dryRun: z.boolean().optional(),
      allowDuplicates: z.boolean().optional(),
    })
    .strict(),
});

function sendCsv(res: Response, filename: string, csv: string, count: number) {
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${date}.csv"`);
  res.setHeader('X-Total-Count', String(count));
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
}

export async function exportLeads(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { csv, count } = await csvService.exportLeads(req.user!);
    sendCsv(res, 'leads', csv, count);
  } catch (err) {
    next(err);
  }
}

export async function exportCustomers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { csv, count } = await csvService.exportCustomers(req.user!);
    sendCsv(res, 'customers', csv, count);
  } catch (err) {
    next(err);
  }
}

export async function importLeads(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const result = await csvService.importLeads(req.user!, req.body);
    res.status(result.dryRun ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function importCustomers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const result = await csvService.importCustomers(req.user!, req.body);
    res.status(result.dryRun ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
}
