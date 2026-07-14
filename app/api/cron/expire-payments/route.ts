/**
 * GET /api/cron/expire-payments
 *
 * Scheduled job that flips stale `Payment` rows to `EXPIRED`. Designed to
 * be invoked by Vercel Cron, but works with any scheduler that can send
 * an authenticated GET request.
 *
 * Auth model
 * ----------
 * The route is protected by a shared secret (`CRON_SECRET`). Callers
 * must send `Authorization: Bearer $CRON_SECRET`. Vercel Cron
 * automatically attaches this header when `CRON_SECRET` is configured
 * in the project's environment variables. Requests without a matching
 * header (or when `CRON_SECRET` is not set on the server) are rejected
 * with `401`.
 *
 * Response
 * --------
 *   - 200 `{ expired: number }`  on success
 *   - 401 `{ error: string }`    on missing/invalid auth
 *   - 500 `{ error: string }`    on unexpected failure
 *
 * Vercel Cron config
 * ------------------
 * To wire this up on Vercel, add to `vercel.json` at the project root
 * (NOT created here — infrastructure-as-code is out of scope for this
 * task):
 *
 *   {
 *     "crons": [
 *       { "path": "/api/cron/expire-payments", "schedule": "* / 5 * * *" }
 *     ]
 *   }
 *
 * (Remove the spaces in the schedule string — they're inserted here so
 * this docblock isn't interpreted as a JSDoc end-comment.) A 5-minute
 * cadence keeps the worst-case "stuck UNPAID" window small while
 * staying well under Vercel's free-tier cron limits. Set `CRON_SECRET`
 * in the Vercel project settings to enable Vercel's built-in
 * authenticated-cron behavior.
 *
 * Validates: Requirements 30.5.
 */

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { expireStalePayments } from "@/lib/payment/expire";

// Prisma needs the Node.js runtime.
export const runtime = "nodejs";
// Never cache the cron endpoint — every invocation must hit the DB.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1) Verify the bearer secret. We require BOTH a configured server
  //    secret AND an exact match — if `CRON_SECRET` is missing we fail
  //    closed rather than allowing unauthenticated access.
  const expected = env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Cron endpoint is not configured (CRON_SECRET is unset)." },
      { status: 401 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Run the sweep.
  try {
    const expired = await expireStalePayments();
    return NextResponse.json({ expired });
  } catch (error) {
    // Log server-side; return a generic message so the secret/path
    // can't leak DB internals to an attacker probing the endpoint.
    console.error("[cron/expire-payments] sweep failed:", error);
    return NextResponse.json(
      { error: "Failed to expire stale payments." },
      { status: 500 },
    );
  }
}
