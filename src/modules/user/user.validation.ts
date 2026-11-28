import { z } from "zod";

export const updateMeSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name cannot be empty")
      .max(100)
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name cannot be empty")
      .max(100)
      .optional(),
    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .toLowerCase()
      .optional(),
    phone: z
      .string()
      .trim()
      .min(6, "Phone number must be at least 6 characters")
      .max(20, "Phone number is too long")
      .optional(),
    designation: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field must be provided for update",
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
