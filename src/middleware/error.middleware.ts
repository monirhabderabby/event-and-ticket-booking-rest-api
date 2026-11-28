import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { ENV } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let data: unknown = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join(".") || "request",
      message: issue.message,
    }));
    message = formattedErrors[0]?.message || "Validation failed";
    data = { errors: formattedErrors };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      message = "A record with this unique value already exists";
    } else if (err.code === "P2023") {
      statusCode = 400;
      message = "Invalid resource ID format";
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Requested resource not found";
    } else {
      statusCode = 400;
      message = "Database request error";
    }
  } else if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError
  ) {
    statusCode = 401;
    message = "Unauthorized: Invalid or expired token";
  } else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Malformed JSON payload";
  } else if (err instanceof Error) {
    if (ENV.NODE_ENV !== "production") {
      message = err.message || message;
    }
  }

  if (statusCode >= 500) {
    console.error("[Server Error]:", err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(data !== undefined ? { data } : {}),
  });
};
