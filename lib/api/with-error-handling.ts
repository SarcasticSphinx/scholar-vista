/**
 * `withErrorHandling(handler)` — a wrapper for Next.js Route Handlers that
 * translates thrown errors into consistent HTTP responses.
 *
 * Translation rules (in priority order):
 *   1. Prisma "database unreachable" errors (`P1001` / `P1002`, including
 *      `PrismaClientInitializationError`) → 503 with a `Retry-After: 30`
 *      header and body `{ error: "Service temporarily unavailable. Please
 *      retry after 30 seconds." }`.
 *   2. `ZodError` → 422 validation response with per-field messages.
 *   3. Known `AppError` subclasses (auth 401 / role 403 / 404 / validation)
 *      keep their declared status codes via `errorResponse`.
 *   4. Anything else → 500 `{ error: "Internal server error" }`.
 *
 * Validates: Requirements 28.5 (database connection failure → 503 Service
 * Unavailable with a retry-after-30s hint). See design doc
 * "Error Sources and Responses".
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, ValidationError } from "@/lib/errors";
import { errorResponse } from "@/lib/errors/response";

type Handler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> | Record<string, string> }
) => Promise<NextResponse>;

/** Prisma error codes that indicate the database cannot be reached. */
const DB_UNREACHABLE_CODES = new Set(["P1001", "P1002"]);

/**
 * Detect a Prisma "database unreachable" error without importing Prisma's
 * runtime classes (keeps this helper usable in any runtime). Matches both
 * `PrismaClientKnownRequestError` (carries `code`) and
 * `PrismaClientInitializationError` (carries `errorCode`).
 */
function isDatabaseUnreachableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; errorCode?: unknown };
  if (typeof e.code === "string" && DB_UNREACHABLE_CODES.has(e.code)) {
    return true;
  }
  if (
    typeof e.errorCode === "string" &&
    DB_UNREACHABLE_CODES.has(e.errorCode)
  ) {
    return true;
  }
  return false;
}

/** Build the standard 503 response with a `Retry-After: 30` header. */
function databaseUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "Service temporarily unavailable. Please retry after 30 seconds." },
    { status: 503, headers: { "Retry-After": "30" } }
  );
}

export function withErrorHandling(handler: Handler): Handler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // 1. Database unreachable → 503 with Retry-After.
      if (isDatabaseUnreachableError(error)) {
        return databaseUnavailableResponse();
      }

      // 2. Zod validation errors → 422 with field messages.
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.issues.forEach((err) => {
          const field = err.path.join(".");
          fieldErrors[field] = [err.message];
        });
        return errorResponse(
          new ValidationError("Validation failed", fieldErrors)
        );
      }

      // 3. Known application errors keep their declared status codes.
      if (error instanceof AppError) {
        return errorResponse(error);
      }

      // 4. Anything else → 500 Internal server error.
      console.error("Unhandled route error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

export { isDatabaseUnreachableError };
