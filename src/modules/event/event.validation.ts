import { z } from "zod";

const isoDate = (field: string) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), {
      message: `${field} must be a valid ISO date`,
    })
    .transform((v) => new Date(v));

const futureDate = (field: string) =>
  isoDate(field).refine((d) => d.getTime() > Date.now(), {
    message: `${field} must be in the future`,
  });

const eventFields = {
  name: z.string().trim().min(1, "Name cannot be empty").max(200),
  shortDescription: z
    .string()
    .trim()
    .min(1, "Short description cannot be empty")
    .max(500),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(300).optional(),
  price: z.number().int("Price must be an integer").min(0, "Price must be >= 0"),
  seat: z
    .number()
    .int("Seat must be an integer")
    .min(1, "Seat must be at least 1"),
  status: z.enum(["draft", "published"]).optional(),
  banner: z.string().trim().url("Banner must be a valid URL").optional(),
};

export const createEventSchema = z
  .object({
    ...eventFields,
    // Published by default so new events appear in public discovery immediately
    status: z.enum(["draft", "published"]).default("published"),
    startTime: futureDate("startTime"),
    endTime: isoDate("endTime").optional(),
  })
  .refine((d) => !d.endTime || d.endTime > d.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const updateEventSchema = z
  .object({
    name: eventFields.name.optional(),
    shortDescription: eventFields.shortDescription.optional(),
    description: eventFields.description,
    category: eventFields.category,
    location: eventFields.location,
    price: eventFields.price.optional(),
    seat: eventFields.seat.optional(),
    status: eventFields.status,
    banner: eventFields.banner,
    startTime: futureDate("startTime").optional(),
    endTime: futureDate("endTime").optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  })
  .refine((d) => !d.startTime || !d.endTime || d.endTime > d.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const eventIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid event ID"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

const positiveInt = (field: string, def: number, max?: number) => {
  let schema = z.coerce
    .number({ error: `${field} must be a number` })
    .int(`${field} must be an integer`)
    .min(1, `${field} must be a positive integer`);
  if (max) schema = schema.max(max, `${field} cannot exceed ${max}`);
  return schema.default(def);
};

const nonNegativeNumber = (field: string) =>
  z.coerce
    .number({ error: `${field} must be a number` })
    .min(0, `${field} must be >= 0`)
    .optional();

export const listEventsQuerySchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
    minPrice: nonNegativeNumber("minPrice"),
    maxPrice: nonNegativeNumber("maxPrice"),
    sortBy: z
      .enum(["startTime", "date", "price"], {
        error: "sortBy must be one of: startTime, date, price",
      })
      .default("startTime")
      .transform((v) => (v === "date" ? "startTime" : v)),
    sortOrder: z
      .enum(["asc", "desc"], { error: "sortOrder must be asc or desc" })
      .default("asc"),
    page: positiveInt("page", 1),
    limit: positiveInt("limit", 10, 100),
  })
  .refine(
    (q) =>
      q.minPrice === undefined ||
      q.maxPrice === undefined ||
      q.minPrice <= q.maxPrice,
    { message: "minPrice cannot be greater than maxPrice", path: ["minPrice"] },
  );

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
