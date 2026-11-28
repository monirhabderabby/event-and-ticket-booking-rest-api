import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { Role } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
  };
}

interface CustomJwtPayload extends JwtPayload {
  userId: string;
  role: Role;
}

export const verifyAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ApiError(401, "Unauthorized: No token provided"));
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(new ApiError(401, "Unauthorized: Invalid token format"));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as CustomJwtPayload;

    if (!decoded.userId) {
      return next(new ApiError(401, "Unauthorized: Invalid token payload"));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return next(new ApiError(401, "Unauthorized: User no longer exists"));
    }

    if (user.status !== "active") {
      return next(new ApiError(403, "Forbidden: Account is not active"));
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          "Forbidden: You do not have permission to perform this action",
        ),
      );
    }

    next();
  };
};
