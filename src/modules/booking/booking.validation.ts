import { z } from "zod";

const objectId = (label: string) =>
  z.string().regex(/^[a-fA-F0-9]{24}$/, `Invalid ${label}`);

export const createBookingSchema = z.object({
  eventId: objectId("event ID"),
  seatsBooked: z
    .number({ error: "seatsBooked must be a number" })
    .int("seatsBooked must be an integer")
    .min(1, "seatsBooked must be at least 1"),
});

export const bookingIdParamSchema = z.object({
  id: objectId("booking ID"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
