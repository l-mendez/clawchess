import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(40, "Name must be 40 characters or less")
    .regex(
      /^[a-zA-Z0-9 _\-'.]+$/,
      "Name can only contain letters, numbers, spaces, underscores, hyphens, apostrophes, and periods"
    ),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
});

export const moveSchema = z.object({
  move: z
    .string()
    .min(2, "Move must be at least 2 characters")
    .max(10, "Move must be 10 characters or less"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
