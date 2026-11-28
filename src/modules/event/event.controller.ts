import { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendResponse } from "../../utils/apiResponse.js";
import {
  CreateEventInput,
  ListEventsQuery,
  UpdateEventInput,
} from "./event.validation.js";

export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    const input = req.body as CreateEventInput;

    const event = await prisma.event.create({
      data: {
        ...input,
        availableSeats: input.seat,
        organizerId: userId,
      },
    });

    sendResponse(res, {
      statusCode: 201,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (
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
    const updates = req.body as UpdateEventInput;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return next(new ApiError(404, "Event not found"));
    }

    if (event.organizerId !== userId) {
      return next(
        new ApiError(403, "Forbidden: You can only modify your own events"),
      );
    }

    if (event.startTime && event.startTime <= new Date()) {
      return next(new ApiError(400, "Cannot modify an event that has already started"));
    }

    const effectiveStart = updates.startTime ?? event.startTime;
    const effectiveEnd = updates.endTime ?? event.endTime;
    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      return next(new ApiError(400, "endTime must be after startTime"));
    }

    let availableSeats: number | undefined;
    if (updates.seat !== undefined) {
      const alreadyBooked = (event.seat ?? 0) - (event.availableSeats ?? 0);
      if (updates.seat < alreadyBooked) {
        return next(
          new ApiError(
            400,
            `Seat count cannot be lower than already booked seats (${alreadyBooked})`,
          ),
        );
      }
      availableSeats = updates.seat - alreadyBooked;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...updates,
        ...(availableSeats !== undefined ? { availableSeats } : {}),
      },
    });

    sendResponse(res, {
      statusCode: 200,
      message: "Event updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (
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

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return next(new ApiError(404, "Event not found"));
    }

    if (event.organizerId !== userId) {
      return next(
        new ApiError(403, "Forbidden: You can only delete your own events"),
      );
    }

    const activeBookings = await prisma.booking.count({
      where: { eventId: id, status: "booked" },
    });
    if (activeBookings > 0) {
      return next(
        new ApiError(400, "Cannot delete an event with active confirmed bookings"),
      );
    }

    // Clean up dependent records so the delete is not blocked by relations.
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { eventId: id } }),
      prisma.booking.deleteMany({ where: { eventId: id } }),
      prisma.coupon.deleteMany({ where: { eventId: id } }),
      prisma.guest.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } }),
    ]);

    sendResponse(res, {
      statusCode: 200,
      message: "Event deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllEvents = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = res.locals.validatedQuery as ListEventsQuery;
    const nameFilter = q.name ?? q.title;

    const and: Prisma.EventWhereInput[] = [{ status: "published" }];

    if (q.category) {
      and.push({ category: { equals: q.category, mode: "insensitive" } });
    }
    if (q.location) {
      and.push({ location: { contains: q.location, mode: "insensitive" } });
    }
    if (nameFilter) {
      and.push({ name: { contains: nameFilter, mode: "insensitive" } });
    }
    if (q.search) {
      and.push({
        OR: [
          { name: { contains: q.search, mode: "insensitive" } },
          { location: { contains: q.search, mode: "insensitive" } },
        ],
      });
    }
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      and.push({
        price: {
          ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
          ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
        },
      });
    }

    const where: Prisma.EventWhereInput = { AND: and };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.event.count({ where }),
    ]);

    sendResponse(res, {
      message: "Events retrieved successfully",
      data: events,
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id as string, status: "published" },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!event) {
      return next(new ApiError(404, "Event not found"));
    }

    sendResponse(res, {
      message: "Event retrieved successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
};
