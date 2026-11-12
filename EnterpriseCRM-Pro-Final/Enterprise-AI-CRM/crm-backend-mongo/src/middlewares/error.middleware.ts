import {
  NextFunction,
  Request,
  Response,
} from 'express';

import mongoose from 'mongoose';

import { ApiError } from '@/utils/apiError';
import { logger } from '@/utils/logger';

/* ============================================================
   404 NOT FOUND
============================================================ */

export function notFoundHandler(
  req: Request,
  res: Response,
) {
  return res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

/* ============================================================
   ERROR HANDLER
============================================================ */

/**
 * Global API error handler.
 *
 * Handles:
 *
 * 1. ApiError
 * 2. Mongoose validation errors
 * 3. MongoDB duplicate key errors
 * 4. MongoDB cast errors
 * 5. Unknown/unexpected errors
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  /* ==========================================================
     0. MALFORMED / OVERSIZED JSON BODY
  ========================================================== */

  if (isBodyParserError(err)) {
    return res.status(err.status).json({
      error:
        err.status === 413
          ? 'Request body is too large'
          : 'Malformed request body',
    });
  }

  /* ==========================================================
     1. CUSTOM API ERROR
  ========================================================== */

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined
        ? { details: err.details }
        : {}),
    });
  }

  /* ==========================================================
     2. MONGOOSE VALIDATION ERROR
  ========================================================== */

  if (
    err instanceof mongoose.Error.ValidationError
  ) {
    const details = Object.values(
      err.errors,
    ).map(error => ({
      field: error.path,
      message: error.message,
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details,
    });
  }

  /* ==========================================================
     3. MONGOOSE CAST ERROR
  ========================================================== */

  if (
    err instanceof mongoose.Error.CastError
  ) {
    return res.status(400).json({
      error: `Invalid ${err.path}`,
    });
  }

  /* ==========================================================
     4. MONGODB DUPLICATE KEY ERROR
  ========================================================== */

  if (
    isMongoDuplicateKeyError(err)
  ) {
    const field =
      getDuplicateField(err);

    let message =
      'A record with this value already exists';

    if (field === 'email') {
      message =
        'An account with this email already exists';
    }

    if (field === 'googleId') {
      message =
        'This Google account is already registered';
    }

    return res.status(409).json({
      error: message,
      details: field
        ? { field }
        : undefined,
    });
  }

  /* ==========================================================
     5. UNKNOWN ERROR
  ========================================================== */

  const requestId = String(res.locals.requestId ?? '');

  logger.error('Unhandled error', {
    requestId,
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.stack ?? err.message : String(err),
  });

  // Never leak stack traces or internals to the client.
  return res.status(500).json({
    error: 'Internal server error',
    requestId,
  });
}

/* ============================================================
   DUPLICATE KEY DETECTION
============================================================ */

function isMongoDuplicateKeyError(
  err: unknown,
): err is {
  code: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
} {
  if (
    typeof err !== 'object' ||
    err === null
  ) {
    return false;
  }

  const mongoError =
    err as {
      code?: unknown;
      keyPattern?: unknown;
      keyValue?: unknown;
    };

  return (
    mongoError.code === 11000
  );
}

/* ============================================================
   DUPLICATE FIELD
============================================================ */

function getDuplicateField(
  err: {
    keyPattern?: Record<
      string,
      unknown
    >;

    keyValue?: Record<
      string,
      unknown
    >;
  },
): string | undefined {
  if (
    err.keyPattern &&
    typeof err.keyPattern === 'object'
  ) {
    const fields =
      Object.keys(
        err.keyPattern,
      );

    if (fields.length > 0) {
      return fields[0];
    }
  }

  if (
    err.keyValue &&
    typeof err.keyValue === 'object'
  ) {
    const fields =
      Object.keys(
        err.keyValue,
      );

    if (fields.length > 0) {
      return fields[0];
    }
  }

  return undefined;
}

/* ============================================================
   BODY PARSER ERRORS
============================================================ */

function isBodyParserError(
  err: unknown,
): err is { status: number; type: string } {
  if (typeof err !== 'object' || err === null) {
    return false;
  }

  const candidate = err as { status?: unknown; type?: unknown };

  return (
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500 &&
    typeof candidate.type === 'string'
  );
}
