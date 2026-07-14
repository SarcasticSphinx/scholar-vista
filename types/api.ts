/**
 * Server Action result types.
 *
 * Every Server Action returns an `ActionResult` discriminated union so the
 * client never has to interpret thrown errors directly. See design doc
 * "Action Result Pattern" and Requirements 28.2, 28.3, 28.5.
 */

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "FORBIDDEN_SELF_CHANGE"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "INVALID_REFERENCE"
  | "INVALID_TRANSITION"
  | "PAYMENT_REQUIRED"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "FEATURE_DISABLED"
  | "DATABASE_UNAVAILABLE"
  | "UPLOAD_FAILED"
  | "INTERNAL";

export interface ActionError {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
