import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as paymentsService from '@/modules/payments/payments.service';
import { invoiceScope, paymentScope } from '@/utils/scope';

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : undefined;
    const payments = await paymentsService.listPayments(req.user!.companyId, { invoiceId }, await paymentScope(req.user!));
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const result = await paymentsService.createPayment(req.user!.companyId, req.user!.userId, req.body, await invoiceScope(req.user!));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function invoiceSummary(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const summary = await paymentsService.getInvoicePaymentSummary(req.user!.companyId, req.params.invoiceId, await invoiceScope(req.user!));
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
