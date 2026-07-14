import { z } from "zod";

/**
 * Review validation schemas.
 *
 * Field constraints (Req 2.6, 10.1, 10.6):
 *   - ratingPoint: integer, 1..5 inclusive
 *   - comment:     10..1000 chars
 *
 * The unique (userId, scholarshipId) constraint is enforced at the database
 * layer (Req 10.3); the Server Action surfaces it as a DUPLICATE error.
 *
 * Validates: Requirements 2.6, 10.1, 10.6
 */

export const ReviewSchema = z.object({
  scholarshipId: z.string().min(1, "Scholarship is required"),
  ratingPoint: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment cannot exceed 1000 characters"),
});
export type ReviewInput = z.infer<typeof ReviewSchema>;

/**
 * Form-only schema used by the client review composer.
 *
 * Uses a strict `z.number()` (no coercion) so the inferred input/output
 * types match — the star picker writes `ratingPoint` as a number via
 * `setValue`, so the wire-shape coercion is unnecessary here. The
 * server action keeps `ReviewSchema`'s `z.coerce.number()` for any
 * untyped `unknown` payloads coming from the network boundary.
 */
export const ReviewFormSchema = z.object({
  ratingPoint: z
    .number({ message: "Rating must be a whole number" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment cannot exceed 1000 characters"),
});
export type ReviewFormInput = z.infer<typeof ReviewFormSchema>;
