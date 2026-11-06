import {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  AnyZodObject,
  ZodError,
} from 'zod';

import { ApiError } from '@/utils/apiError';

/**
 * Validates request body, query and params
 * against a Zod schema.
 *
 * The schema should have this structure:
 *
 * {
 *   body: ...,
 *   query: ...,
 *   params: ...
 * }
 *
 * Parsed values are written back to the request.
 */
export function validate(
  schema: AnyZodObject,
) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    try {
      /* ------------------------------------------------------
         PARSE REQUEST
      ------------------------------------------------------ */

      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      /* ------------------------------------------------------
         REPLACE WITH VALIDATED VALUES
      ------------------------------------------------------ */

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }

      if (parsed.query !== undefined) {
        req.query = parsed.query;
      }

      if (parsed.params !== undefined) {
        req.params = parsed.params;
      }

      return next();
    } catch (err) {
      /* ------------------------------------------------------
         ZOD VALIDATION ERROR
      ------------------------------------------------------ */

      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest(
            'Validation failed',
            err.flatten(),
          ),
        );
      }

      /* ------------------------------------------------------
         UNKNOWN ERROR
      ------------------------------------------------------ */

      return next(err);
    }
  };
}