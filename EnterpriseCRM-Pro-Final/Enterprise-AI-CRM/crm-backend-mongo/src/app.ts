import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { env } from '@/config/env';

import {
  notFoundHandler,
  errorHandler,
} from '@/middlewares/error.middleware';

import {
  rateLimit,
  requestId,
  sanitizeInput,
} from '@/middlewares/security.middleware';

/* ============================================================
   ROUTES
============================================================ */

import authRoutes from '@/modules/auth/auth.routes';
import usersRoutes from '@/modules/users/users.routes';
import customersRoutes from '@/modules/customers/customers.routes';
import leadsRoutes from '@/modules/leads/leads.routes';
import opportunitiesRoutes from '@/modules/opportunities/opportunities.routes';
import activitiesRoutes from '@/modules/activities/activities.routes';

import dashboardRoutes from '@/modules/dashboard/dashboard.routes';

import productsRoutes from '@/modules/products/products.routes';
import invoicesRoutes from '@/modules/invoices/invoices.routes';
import paymentsRoutes from '@/modules/payments/payments.routes';

import calendarRoutes from '@/modules/calendar/calendar.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';

import reportsRoutes from '@/modules/reports/reports.routes';

import aiRoutes from '@/modules/ai/ai.routes';

import companyRoutes from '@/modules/company/company.routes';

import teamsRoutes from '@/modules/teams/teams.routes';

/* ============================================================
   APP
============================================================ */

export const app = express();

app.disable('x-powered-by');

if (env.trustProxy > 0) {
  app.set('trust proxy', env.trustProxy);
}

app.use(requestId);

/* ============================================================
   SECURITY
============================================================ */

app.use(helmet());

/* ============================================================
   CORS
============================================================ */

// Mobile apps send no Origin header and are unaffected by CORS;
// this list only governs browsers (the Expo web build).
app.use(
  cors({
    origin:
      env.corsOrigin === '*'
        ? true
        : env.corsOrigin.split(',').map(origin => origin.trim()),
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  }),
);

/* ============================================================
   BODY PARSER
============================================================ */

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(sanitizeInput);

/* ============================================================
   LOGGING
============================================================ */

if (!env.isTest) {
  morgan.token('request-id', (_req, res) => String(res.getHeader('X-Request-Id') ?? '-'));
  app.use(
    morgan(
      env.nodeEnv === 'development'
        ? 'dev'
        : ':request-id :remote-addr :method :url :status :res[content-length] - :response-time ms',
    ),
  );
}

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/* Readiness: only ready when MongoDB is connected. */
app.get('/api/v1/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    database: ready ? 'connected' : 'disconnected',
  });
});

/* General API rate limit (per IP). */
app.use(
  '/api/v1',
  rateLimit({
    windowMs: env.rateLimit.apiWindowMs,
    max: env.rateLimit.apiMax,
  }),
);

/* ============================================================
   API ROUTES
============================================================ */

app.use(
  '/api/v1/auth',
  authRoutes,
);

app.use(
  '/api/v1/users',
  usersRoutes,
);

app.use(
  '/api/v1/customers',
  customersRoutes,
);

app.use(
  '/api/v1/leads',
  leadsRoutes,
);

app.use(
  '/api/v1/opportunities',
  opportunitiesRoutes,
);

app.use(
  '/api/v1/activities',
  activitiesRoutes,
);

app.use(
  '/api/v1/dashboard',
  dashboardRoutes,
);

app.use(
  '/api/v1/products',
  productsRoutes,
);

app.use(
  '/api/v1/invoices',
  invoicesRoutes,
);

app.use(
  '/api/v1/payments',
  paymentsRoutes,
);

app.use(
  '/api/v1/calendar',
  calendarRoutes,
);

app.use(
  '/api/v1/notifications',
  notificationsRoutes,
);

app.use(
  '/api/v1/reports',
  reportsRoutes,
);

app.use(
  '/api/v1/ai',
  aiRoutes,
);

app.use(
  '/api/v1/company',
  companyRoutes,
);

app.use(
  '/api/v1/teams',
  teamsRoutes,
);

/* ============================================================
   404 HANDLER
============================================================ */

app.use(notFoundHandler);

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(errorHandler);