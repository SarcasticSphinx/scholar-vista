import { z } from "zod";

/**
 * Bookmark validation.
 *
 * Constraints (Req 2.9, 8.1, 8.2):
 *   - userId, scholarshipId: non-empty string ids
 *   - unique (userId, scholarshipId) is enforced at the database layer;
 *     duplicate inserts raise Prisma's P2002 (Property 3 / Req 2.9).
 *
 * Validates: Requirements 2.9, 8.1, 8.2
 */

export const BookmarkSchema = z.object({
  userId: z.string().min(1, "User is required"),
  scholarshipId: z.string().min(1, "Scholarship is required"),
});
export type BookmarkInput = z.infer<typeof BookmarkSchema>;

/** Server Action input for `toggleBookmark` (Req 8.1, 8.2). */
export const BookmarkToggleSchema = z.object({
  scholarshipId: z.string().min(1, "Scholarship is required"),
});
export type BookmarkToggleInput = z.infer<typeof BookmarkToggleSchema>;
