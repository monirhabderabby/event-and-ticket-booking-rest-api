import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { Role } from "../../generated/prisma/client.js";
import { sendWelcomeEmail } from "../../services/email.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { LoginInput, RegisterInput } from "./auth.validation.js";

const safeUserSelect = {
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

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, phone, designation } =
      req.body as RegisterInput;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
      select: { id: true, email: true, phone: true },
    });

    if (existingUser) {
      const conflictField =
        existingUser.email === email ? "Email" : "Phone number";
      return next(new ApiError(409, `${conflictField} is already registered`));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: Role.user,
        ...(designation !== undefined ? { designation } : {}),
      },
      select: safeUserSelect,
    });

    // Non-blocking transactional welcome email
    void sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    sendResponse(res, {
      statusCode: 201,
      message: "Account created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    if (user.status !== "active") {
      return next(new ApiError(403, "Forbidden: Account is not active"));
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      ENV.JWT_SECRET,
      {
        expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );

    const { password: _hidden, ...safeUser } = user;

    sendResponse(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
