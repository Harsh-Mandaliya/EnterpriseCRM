import { randomUUID } from 'crypto';

import {
  NextFunction,
  Request,
  Response,
} from 'express';

import { ApiError } from '@/utils/apiError';

/* ============================================================
   REQUEST ID
   ------------------------------------------------------------
   Every request gets a correlation id (or keeps a sane one the
   caller sent) which is echoed in the X-Request-Id header and
   included in error logs.
============================================================ */

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id');

  const id =
    incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming)
      ? incoming
      : randomUUID();

  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);

  next();
}

/* ============================================================
   NOSQL INJECTION GUARD
   ------------------------------------------------------------
   Removes keys that start with "$" or contain "." from the
   body and params so operator objects such as
   { "email": { "$ne": null } } can never reach a Mongo query.

   Query-string values that arrive as objects/arrays (e.g.
   ?status[$ne]=x) are rejected outright — every endpoint here
   expects scalar query parameters.
============================================================ */

function stripOperators(value: unknown, depth = 0): unknown {
  if (depth > 20) {
    throw ApiError.badRequest('Payload is nested too deeply');
  }

  if (Array.isArray(value)) {
    return value.map(item => stripOperators(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};

    for (const [key, inner] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      clean[key] = stripOperators(inner, depth + 1);
    }

    return clean;
  }

  return value;
}

export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = stripOperators(req.body);
    }

    for (const value of Object.values(req.query)) {
      if (value !== undefined && typeof value !== 'string') {
        return next(
          ApiError.badRequest('Query parameters must be plain values'),
        );
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   RATE LIMITER
   ------------------------------------------------------------
   Small fixed-window, in-memory limiter. Good for a single
   instance; behind multiple instances use a shared store
   (Redis) — see docs/DEPLOYMENT.md.
============================================================ */

interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Builds the bucket key; defaults to the client IP. */
  key?: (req: Request) => string;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, options.windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = (options.key ?? (r => r.ip ?? 'unknown'))(req);

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader(
      'RateLimit-Remaining',
      String(Math.max(0, options.max - entry.count)),
    );

    if (entry.count > options.max) {
      res.setHeader(
        'Retry-After',
        String(Math.ceil((entry.resetAt - now) / 1000)),
      );
      return next(
        new ApiError(
          429,
          options.message ?? 'Too many requests, please try again later',
        ),
      );
    }

    return next();
  };
}
