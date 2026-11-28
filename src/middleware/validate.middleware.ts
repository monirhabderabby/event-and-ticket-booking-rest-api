import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { ApiError } from "../utils/ApiError.js";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export const validate = (schemas: ValidationSchemas) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        Object.assign(req.params, parsedParams);
      }

      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        res.locals.validatedQuery = parsedQuery;
      }

      if (schemas.body) {
        if (!req.body || typeof req.body !== "object") {
          return next(new ApiError(400, "Request body must be a valid JSON object"));
        }
        req.body = await schemas.body.parseAsync(req.body);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
