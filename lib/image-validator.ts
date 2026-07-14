/**
 * Client-side image validator.
 *
 * Performs the pre-upload check declared in Requirements 26.2, 26.3, 26.4 so
 * the user gets immediate feedback before an UploadThing request is initiated.
 * The same constraints are enforced server-side by the UploadThing FileRouter
 * (`app/api/uploadthing/core.ts`) and the `ImageUploadSchema` in
 * `lib/validation/image.ts`; this helper exists to short-circuit on the client.
 *
 * Constraints (sourced from `lib/validation/image.ts`, NOT redefined here):
 *   - mime ∈ {@link ALLOWED_IMAGE_MIME_TYPES} ({"image/jpeg", "image/png", "image/webp"})
 *   - size ≤ {@link MAX_IMAGE_SIZE_BYTES} (5 MiB = 5 * 1024 * 1024 bytes)
 *
 * Validates: Requirements 26.2, 26.3, 26.4.
 */

import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/validation/image";

/**
 * Minimal subset of the browser `File` interface that this validator needs.
 * Accepting a structural shape (rather than `File`) lets us unit/property-test
 * the predicate in a non-DOM Vitest environment.
 */
export type ImageFileLike = { type: string; size: number };

/** Discriminated union returned by {@link validateImage}. */
export type ImageValidationResult =
  | { ok: true }
  | { ok: false; error: ImageValidationErrorCode; message: string };

/** Identifies which rule rejected the file. */
export type ImageValidationErrorCode = "INVALID_TYPE" | "TOO_LARGE";

/**
 * Validate an image file against the allowed mime-type set and the maximum
 * size. Returns `{ ok: true }` iff both rules pass; otherwise returns an
 * error result whose `error` field identifies the failed rule.
 *
 * Mime-type is checked first so callers see the most actionable message when
 * a file fails on multiple rules (e.g. an oversized PDF reports `INVALID_TYPE`
 * rather than `TOO_LARGE`).
 *
 * @example
 *   const result = validateImage(file);
 *   if (!result.ok) toast.error(result.message);
 */
export function validateImage(file: File | ImageFileLike): ImageValidationResult {
  const mime = file.type;
  const size = file.size;

  if (!isAllowedMime(mime)) {
    return {
      ok: false,
      error: "INVALID_TYPE",
      message: `Unsupported file type${
        mime ? ` "${mime}"` : ""
      }. Allowed types: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}.`,
    };
  }

  if (size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: "TOO_LARGE",
      message: `File is ${formatFileSize(
        size
      )}, which exceeds the ${formatFileSize(
        MAX_IMAGE_SIZE_BYTES
      )} maximum.`,
    };
  }

  return { ok: true };
}

/**
 * Type-guard narrowing an arbitrary string to one of the allowed image mime
 * types declared in {@link ALLOWED_IMAGE_MIME_TYPES}.
 */
function isAllowedMime(
  mime: string
): mime is (typeof ALLOWED_IMAGE_MIME_TYPES)[number] {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Format a byte count as a short human-readable string using binary units
 * (1 KB = 1024 B), matching how {@link MAX_IMAGE_SIZE_BYTES} is defined.
 *
 * Examples:
 *   formatFileSize(0)            // "0 B"
 *   formatFileSize(512)          // "512 B"
 *   formatFileSize(1536)         // "1.5 KB"
 *   formatFileSize(5 * 1024**2)  // "5 MB"
 *
 * Negative or non-finite inputs are clamped to `0 B` so this helper is safe
 * to call directly with values pulled from untyped sources (e.g. drag-and-
 * drop events).
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** exponent;

  // Whole-number bytes never get a decimal; larger units round to one place
  // and trim a trailing ".0" so "5.0 MB" reads as "5 MB".
  const formatted =
    exponent === 0
      ? value.toString()
      : value
          .toFixed(1)
          .replace(/\.0$/, "");

  return `${formatted} ${units[exponent]}`;
}
