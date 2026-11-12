import {
  Response,
  NextFunction,
} from 'express';

import {
  AuthedRequest,
} from '@/middlewares/auth.middleware';

import * as customersService
  from '@/modules/customers/customers.service';

import {
  findDuplicates,
} from '@/utils/duplicates';

/* ============================================================
   LIST
============================================================ */

export async function list(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const rawPage =
      Number(
        req.query.page ?? 1,
      );

    const rawPageSize =
      Number(
        req.query.pageSize ?? 20,
      );

    const page =
      Number.isFinite(rawPage) &&
      rawPage > 0
        ? Math.floor(rawPage)
        : 1;

    const pageSize =
      Number.isFinite(rawPageSize) &&
      rawPageSize > 0
        ? Math.min(
            Math.floor(rawPageSize),
            100,
          )
        : 20;

    const search =
      typeof req.query.search ===
      'string'
        ? req.query.search
        : undefined;

    const result =
      await customersService.listCustomers(
        req.user!,
        {
          page,
          pageSize,
          search,
          ownerId:
            typeof req.query.ownerId === 'string'
              ? req.query.ownerId
              : undefined,
        },
      );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   GET ONE
============================================================ */

export async function getOne(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const customer =
      await customersService.getCustomer(
        req.user!,
        req.params.id,
      );

    res.json(customer);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   CREATE
============================================================ */

export async function create(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const customer =
      await customersService.createCustomer(
        req.user!,
        req.body,
      );

    res
      .status(201)
      .json(customer);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   UPDATE
============================================================ */

export async function update(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const customer =
      await customersService.updateCustomer(
        req.user!,
        req.params.id,
        req.body,
      );

    res.json(customer);
  } catch (err) {
    next(err);
  }
}

/* ============================================================
   DELETE
============================================================ */

export async function remove(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await customersService.deleteCustomer(
        req.user!,
      req.params.id,
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
/* ============================================================
   DUPLICATES
   GET /customers/duplicates?email=&phone=&excludeId=
============================================================ */

export async function duplicates(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, phone, excludeId } =
      req.query as Record<string, string | undefined>;

    const matches =
      await findDuplicates(
        req.user!,
        { email, phone },
        excludeId
          ? { type: 'customer', id: excludeId }
          : null,
      );

    res.json({ duplicates: matches });
  } catch (err) {
    next(err);
  }
}
