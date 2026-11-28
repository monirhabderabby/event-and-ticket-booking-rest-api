import { NextFunction, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
} from "../../services/email.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { CreateBookingInput } from "./booking.validation.js";

export const createBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    const { eventId, seatsBooked } = req.body as CreateBookingInput;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return next(new ApiError(404, "Event not found"));
    }

    if (event.status !== "published") {
      return next(new ApiError(400, "Event is not open for booking"));
    }

    if (!event.startTime || event.startTime <= new Date()) {
      return next(
        new ApiError(400, "Cannot book an event that has already started"),
      );
    }

    if (event.availableSeats === null || event.availableSeats < seatsBooked) {
      return next(new ApiError(400, "Not enough available seats"));
    }

    const totalPrice = (event.price ?? 0) * seatsBooked;

    const booking = await prisma.$transaction(async (tx) => {
      // Conditional decrement: count is 0 if a concurrent request took the seats
      const { count } = await tx.event.updateMany({
        where: { id: eventId, availableSeats: { gte: seatsBooked } },
        data: { availableSeats: { decrement: seatsBooked } },
      });

      if (count !== 1) {
        throw new ApiError(400, "Not enough available seats");
      }

      return tx.booking.create({
        data: { userId, eventId, seatsBooked, totalPrice, status: "booked" },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (user) {
      void sendBookingConfirmationEmail({
        to: user.email,
        firstName: user.firstName,
        eventName: event.name,
        startTime: event.startTime,
        location: event.location,
        seatsBooked,
        totalPrice,
        bookingId: booking.id,
      });
    }

    sendResponse(res, {
      statusCode: 201,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyTickets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startTime: true,
            location: true,
            price: true,
          },
        },
      },
    });

    sendResponse(res, {
      message: "Tickets retrieved successfully",
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    const id = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        user: { select: { email: true, firstName: true } },
      },
    });

    if (!booking) {
      return next(new ApiError(404, "Booking not found"));
    }

    if (booking.userId !== userId) {
      return next(
        new ApiError(403, "Forbidden: You can only cancel your own bookings"),
      );
    }

    if (booking.status !== "booked") {
      return next(
        new ApiError(400, "Booking is already canceled or not active"),
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.booking.updateMany({
        where: { id, status: "booked" },
        data: { status: "canceled" },
      });

      if (count !== 1) {
        throw new ApiError(400, "Booking is already canceled or not active");
      }

      await tx.event.update({
        where: { id: booking.eventId },
        data: { availableSeats: { increment: booking.seatsBooked } },
      });

      return tx.booking.findUniqueOrThrow({ where: { id } });
    });

    void sendBookingCancellationEmail({
      to: booking.user.email,
      firstName: booking.user.firstName,
      eventName: booking.event.name,
      startTime: booking.event.startTime,
      location: booking.event.location,
      seatsBooked: booking.seatsBooked,
      totalPrice: booking.totalPrice,
      bookingId: booking.id,
    });

    sendResponse(res, {
      message: "Booking canceled successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
