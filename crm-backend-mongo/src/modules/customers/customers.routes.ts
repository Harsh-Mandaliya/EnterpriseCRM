import {
  Router,
} from 'express';

import * as customersController
  from '@/modules/customers/customers.controller';

import {
  requireAuth,
} from '@/middlewares/auth.middleware';

import {
  requireRole,
} from '@/middlewares/rbac.middleware';

import {
  validate,
} from '@/middlewares/validate.middleware';

import {
  createCustomerSchema,
  updateCustomerSchema,
} from '@/modules/customers/customers.validation';

import {
  duplicatesQuerySchema,
} from '@/modules/leads/leads.validation';

import {
  CAN_EXPORT_DATA,
  CAN_IMPORT_DATA,
  CAN_MANAGE_BUSINESS_DATA,
} from '@/utils/permissions';

import * as csvController
  from '@/modules/csv/csv.controller';

import {
  importSchema,
} from '@/modules/csv/csv.controller';

const router =
  Router();

/* ============================================================
   AUTH
============================================================ */

router.use(
  requireAuth,
);

/* ============================================================
   READ
============================================================ */

/*
 * Every authenticated role can view customers.
 */

router.get(
  '/',
  customersController.list,
);

router.get(
  '/duplicates',
  validate(duplicatesQuerySchema),
  customersController.duplicates,
);

/* ============================================================
   CSV EXPORT / IMPORT
============================================================ */

router.get(
  '/export',
  requireRole(
    ...CAN_EXPORT_DATA,
  ),
  csvController.exportCustomers,
);

router.post(
  '/import',
  requireRole(
    ...CAN_IMPORT_DATA,
  ),
  validate(importSchema),
  csvController.importCustomers,
);

router.get(
  '/:id',
  customersController.getOne,
);

/* ============================================================
   CREATE
============================================================ */

/*
 * OWNER
 * ADMIN
 * MANAGER
 * SALES
 *
 * can create customers.
 */

router.post(
  '/',
  requireRole(
    ...CAN_MANAGE_BUSINESS_DATA,
  ),
  validate(
    createCustomerSchema,
  ),
  customersController.create,
);

/* ============================================================
   UPDATE
============================================================ */

router.patch(
  '/:id',
  requireRole(
    ...CAN_MANAGE_BUSINESS_DATA,
  ),
  validate(
    updateCustomerSchema,
  ),
  customersController.update,
);

/* ============================================================
   DELETE
============================================================ */

router.delete(
  '/:id',
  requireRole(
    ...CAN_MANAGE_BUSINESS_DATA,
  ),
  customersController.remove,
);

export default router;