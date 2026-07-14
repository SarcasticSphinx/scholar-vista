import { z } from "zod";

/**
 * Image upload validation.
 *
 * Constraints (Req 26.2, 26.3):
 *   - mime:  one of "image/jpeg", "image/png", "image/webp"
 *   - size:  ≤ 5 MB (5 * 1024 * 1024 bytes)
 *
 * Used by `lib/image-validator.ts` (client-side pre-upload check) and the
 * UploadThing FileRouter middleware. Property 26 verifies the predicate
 * across (mime, size) arbitraries.
 *
 * Validates: Requirements 26.2, 26.3
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const ImageMimeEnum = z.enum(ALLOWED_IMAGE_MIME_TYPES);
export type ImageMime = z.infer<typeof ImageMimeEnum>;

/**
 * Pre-upload metadata schema. Files are validated by extracting `type`
 * (mime) and `size` from the browser `File` object before initiating the
 * UploadThing request.
 */
export const ImageUploadSchema = z.object({
  mime: ImageMimeEnum,
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_SIZE_BYTES, "Image must be 5 MB or smaller"),
});
export type ImageUploadInput = z.infer<typeof ImageUploadSchema>;

/**
 * URL-only schema for persisted image fields (profilePicture, scholarship
 * image, university logo). Length aligns with VarChar(500) on related models.
 */
export const ImageUrlSchema = z.url().max(500);
export type ImageUrl = z.infer<typeof ImageUrlSchema>;
