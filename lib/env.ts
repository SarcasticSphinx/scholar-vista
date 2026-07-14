/**
 * Environment variable validation.
 *
 * Validates `process.env` at startup using Zod and exposes a typed `env`
 * object for the rest of the application.
 *
 * Required: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL.
 * Optional: NEXT_PUBLIC_APP_URL, GOOGLE_CLIENT_ID/SECRET, UPLOADTHING_*,
 *           STRIPE_*, CRON_SECRET.
 *
 * Optional vars treat empty strings (`""`) the same as `undefined` so that
 * `.env.example`-style empty placeholders don't accidentally count as
 * "configured". Required vars must be present and non-empty.
 *
 * Validates: Requirements 1.10, 1.11.
 */

import { z } from "zod";

/** Coerce empty strings to `undefined` so optional fields stay optional. */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : v));

const optionalUrl = optionalString.pipe(z.string().url().optional());

const envSchema = z.object({
  // Node runtime
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // --- Required ----------------------------------------------------------
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL must not be empty"),

  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET is required" })
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

  BETTER_AUTH_URL: z
    .string({ error: "BETTER_AUTH_URL is required" })
    .url("BETTER_AUTH_URL must be a valid URL"),

  // --- Optional ----------------------------------------------------------
  NEXT_PUBLIC_APP_URL: optionalUrl,

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  UPLOADTHING_TOKEN: optionalString,
  UPLOADTHING_SECRET: optionalString,

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_PUBLISHABLE_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,

  CRON_SECRET: optionalString,
});

/** Format a ZodError into a developer-friendly multi-line message. */
function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `  - ${path}: ${issue.message}`;
  });
  return [
    "❌ Invalid environment variables:",
    ...lines,
    "",
    "See `.env.example` for the full list of expected variables.",
  ].join("\n");
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Throw at module load so misconfigured environments fail fast and loudly.
  console.error(formatZodError(parsed.error));
  throw new Error("Invalid environment variables. See logs above.");
}

/** Validated, typed environment variables. Import this everywhere instead of `process.env`. */
export const env = parsed.data;

export type Env = typeof env;
