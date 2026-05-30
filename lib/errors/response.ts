import { NextResponse } from "next/server";
import { AppError } from "./base";
import { ValidationError } from "./http";

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error instanceof ValidationError &&
          error.fieldErrors && { fieldErrors: error.fieldErrors }),
      },
      { status: error.statusCode }
    );
  }

  console.error("Unexpected error:", error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
