/**
 * Unit tests for `withErrorHandling` (`lib/api/with-error-handling.ts`).
 *
 * Covers the Route Handler error-translation contract:
 *   - Prisma `P1001` / `P1002` (known + initialization errors) → 503 with
 *     `Retry-After: 30` and the standard "temporarily unavailable" body.
 *   - `ZodError` → 422 validation response with field messages.
 *   - `AppError` subclasses (e.g. 401) keep their declared status code.
 *   - Any other thrown value → 500 `{ error: "Internal server error" }`.
 *   - The happy path passes the handler's response through untouched.
 *
 * Validates: Requirements 28.5.
 */

import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { UnauthorizedError } from "@/lib/errors";

import { isDatabaseUnreachableError, withErrorHandling } from "./with-error-handling";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/test");
}

/** Mimic `Prisma.PrismaClientKnownRequestError` shape for a given code. */
function prismaKnownError(code: string): Error & { code: string } {
  const err = new Error(`Prisma known error ${code}`) as Error & {
    code: string;
  };
  err.name = "PrismaClientKnownRequestError";
  err.code = code;
  return err;
}

/** Mimic `Prisma.PrismaClientInitializationError` shape for a given code. */
function prismaInitError(errorCode: string): Error & { errorCode: string } {
  const err = new Error(`Prisma init error ${errorCode}`) as Error & {
    errorCode: string;
  };
  err.name = "PrismaClientInitializationError";
  err.errorCode = errorCode;
  return err;
}

describe("withErrorHandling — database unreachable", () => {
  for (const code of ["P1001", "P1002"]) {
    it(`maps known error ${code} to 503 with Retry-After: 30`, async () => {
      const handler = withErrorHandling(async () => {
        throw prismaKnownError(code);
      });

      const res = await handler(makeRequest());

      expect(res.status).toBe(503);
      expect(res.headers.get("Retry-After")).toBe("30");
      await expect(res.json()).resolves.toEqual({
        error: "Service temporarily unavailable. Please retry after 30 seconds.",
      });
    });

    it(`maps initialization error ${code} to 503 with Retry-After: 30`, async () => {
      const handler = withErrorHandling(async () => {
        throw prismaInitError(code);
      });

      const res = await handler(makeRequest());

      expect(res.status).toBe(503);
      expect(res.headers.get("Retry-After")).toBe("30");
    });
  }

  it("detects unreachable errors via isDatabaseUnreachableError", () => {
    expect(isDatabaseUnreachableError(prismaKnownError("P1001"))).toBe(true);
    expect(isDatabaseUnreachableError(prismaInitError("P1002"))).toBe(true);
    expect(isDatabaseUnreachableError(prismaKnownError("P2002"))).toBe(false);
    expect(isDatabaseUnreachableError(new Error("boom"))).toBe(false);
    expect(isDatabaseUnreachableError(null)).toBe(false);
  });
});

describe("withErrorHandling — other errors", () => {
  it("maps an arbitrary thrown error to 500 Internal server error", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("unexpected");
    });

    const res = await handler(makeRequest());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });

  it("maps a P2002 (duplicate) error to 500, not 503", async () => {
    const handler = withErrorHandling(async () => {
      throw prismaKnownError("P2002");
    });

    const res = await handler(makeRequest());

    expect(res.status).toBe(500);
    expect(res.headers.get("Retry-After")).toBeNull();
  });

  it("maps a ZodError to a 422 validation response", async () => {
    const schema = z.object({ name: z.string().min(3) });
    const handler = withErrorHandling(async () => {
      schema.parse({ name: "a" });
      return NextResponse.json({ ok: true });
    });

    const res = await handler(makeRequest());

    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors?: Record<string, string[]> };
    expect(body.fieldErrors?.name).toBeDefined();
  });

  it("preserves the status code of a known AppError (401)", async () => {
    const handler = withErrorHandling(async () => {
      throw new UnauthorizedError();
    });

    const res = await handler(makeRequest());

    expect(res.status).toBe(401);
  });
});

describe("withErrorHandling — happy path", () => {
  it("passes the handler response through untouched", async () => {
    const handler = withErrorHandling(async () => {
      return NextResponse.json({ count: 7 }, { status: 200 });
    });

    const res = await handler(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 7 });
  });
});
