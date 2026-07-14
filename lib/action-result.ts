/**
 * Helpers for building `ActionResult` values returned by Server Actions.
 *
 * - `ok(data)` constructs a success result.
 * - `fail(code, message, fieldErrors?)` constructs an error result.
 * - `prismaErrorToActionResult(error)` maps known Prisma error codes to the
 *   appropriate `ErrorCode` (see design doc "Error Sources and Responses"
 *   and Requirements 28.2, 28.3, 28.5).
 */

import type { ActionResult, ErrorCode } from "@/types/api";

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

// Overloads keep the return type as `ActionResult<T>` so callers can compose
// `fail(...)` inside a function whose success branch yields `T`.
export function fail<T = void>(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<T>;
export function fail(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResult {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
  };
}

/**
 * Narrowing helper: detect the shape of `Prisma.PrismaClientKnownRequestError`
 * without importing it directly, so this helper stays usable wherever Prisma
 * runtime types are not in scope.
 */
function isPrismaKnownError(
  error: unknown
): error is { code: string; message: string; meta?: Record<string, unknown> } {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { name?: unknown; code?: unknown };
  return (
    typeof e.code === "string" &&
    (e.name === "PrismaClientKnownRequestError" ||
      // Fallback for environments where the constructor name is mangled.
      /^P\d{4}$/.test(e.code as string))
  );
}

function isPrismaInitializationError(
  error: unknown
): error is { errorCode?: string; message: string } {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { name?: unknown; errorCode?: unknown };
  return (
    e.name === "PrismaClientInitializationError" ||
    (typeof e.errorCode === "string" &&
      (e.errorCode === "P1001" || e.errorCode === "P1002"))
  );
}

/**
 * Map a thrown Prisma (or unknown) error to an `ActionResult`.
 *
 * - `P2002` (unique constraint) → `DUPLICATE`
 * - `P2003` (foreign-key violation) → `INVALID_REFERENCE`
 * - `P1001` / `P1002` (database unreachable / timed out) → `DATABASE_UNAVAILABLE`
 * - everything else → `INTERNAL`
 */
export function prismaErrorToActionResult<T = void>(
  error: unknown
): ActionResult<T> {
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case "P2002":
        return fail<T>(
          "DUPLICATE",
          "A record with the same unique value already exists."
        );
      case "P2003":
        return fail<T>(
          "INVALID_REFERENCE",
          "Referenced record does not exist."
        );
      case "P1001":
      case "P1002":
        return fail<T>(
          "DATABASE_UNAVAILABLE",
          "The database is currently unreachable. Please try again."
        );
    }
  }

  if (isPrismaInitializationError(error)) {
    return fail<T>(
      "DATABASE_UNAVAILABLE",
      "The database is currently unreachable. Please try again."
    );
  }

  return fail<T>("INTERNAL", "An unexpected error occurred.");
}
