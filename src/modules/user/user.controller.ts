import { NextFunction, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { UpdateMeInput } from "./user.validation.js";

const userProfileSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  designation: true,
  emailVerfication: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    sendResponse(res, {
      statusCode: 200,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    const updates = req.body as UpdateMeInput;

    if (updates.email || updates.phone) {
      const conflictConditions = [
        ...(updates.email ? [{ email: updates.email }] : []),
        ...(updates.phone ? [{ phone: updates.phone }] : []),
      ];

      const existingConflict = await prisma.user.findFirst({
        where: {
          AND: [{ id: { not: userId } }, { OR: conflictConditions }],
        },
        select: { email: true, phone: true },
      });

      if (existingConflict) {
        const conflictField =
          updates.email && existingConflict.email === updates.email
            ? "Email"
            : "Phone number";
        return next(new ApiError(409, `${conflictField} is already in use`));
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.firstName !== undefined
          ? { firstName: updates.firstName }
          : {}),
        ...(updates.lastName !== undefined
          ? { lastName: updates.lastName }
          : {}),
        ...(updates.email !== undefined ? { email: updates.email } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
        ...(updates.designation !== undefined
          ? { designation: updates.designation }
          : {}),
      },
      select: userProfileSelect,
    });

    sendResponse(res, {
      statusCode: 200,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
