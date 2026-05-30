import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors/response";
import { ZodError } from "zod";
import { ValidationError } from "@/lib/errors";

type Handler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
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
      return errorResponse(error);
    }
  };
}
