import { Response, NextFunction } from 'express';
import { track } from '@/utils/track';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as invoicesService from '@/modules/invoices/invoices.service';
import { invoiceScope } from '@/utils/scope';

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const invoices = await invoicesService.listInvoices(req.user!.companyId, { status, customerId }, await invoiceScope(req.user!));
    res.json(invoices);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.getInvoice(req.user!.companyId, req.params.id, await invoiceScope(req.user!));
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.createInvoice(req.user!.companyId, req.user!.userId, req.body);
    await track(req.user!, 'invoice.created', 'Invoice', { id: invoice.id, label: invoice.invoiceNumber }, { total: invoice.total });
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.updateInvoice(req.user!.companyId, req.params.id, req.body, await invoiceScope(req.user!));
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.updateInvoiceStatus(req.user!.companyId, req.params.id, req.body.status, await invoiceScope(req.user!));
    await track(req.user!, 'invoice.status_changed', 'Invoice', { id: invoice.id, label: invoice.invoiceNumber }, { to: invoice.status });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await invoicesService.deleteInvoice(req.user!.companyId, req.params.id, await invoiceScope(req.user!));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
