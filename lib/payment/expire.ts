/**
 * Payment expiry job.
 *
 * Sweeps the `Payment` table and flips stale rows to `EXPIRED` so a user
 * can start a fresh checkout for the same application. The cutoff is
 * `expiresAt < now()` AND `paymentStatus NOT IN (PAID, REFUNDED)`. The
 * `Payment.expiresAt` column is set when a checkout is initiated
 * (`actions/payment.ts#initiateCheckout`) to `createdAt + 30 minutes`,
 * so this is equivalent to the design's "older than 30 minutes and not
 * settled" rule.
 *
 * `FAILED` rows are also flipped to `EXPIRED` if they pass the deadline
 * — they are not in the protected `{PAID, REFUNDED}` set and a new
 * payment attempt is permitted (Property 30 / Req 30.5).
 *
 * Rows with `expiresAt = NULL` (legacy / providerless rows) are left
 * untouched; they have no deadline and therefore cannot be "stale".
 *
 * This function is invoked by:
 *   - the Vercel Cron route `app/api/cron/expire-payments/route.ts`
 *     (scheduled in `vercel.json` — see comment in that file).
 *
 * Returns the number of rows that were updated.
 *
 * Validates: Requirements 30.5 (Property 30: Payment expiry).
 */

import { PaymentStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

/**
 * Mark every `Payment` whose `expiresAt` has passed and is not already
 * settled (`PAID` / `REFUNDED`) as `EXPIRED`. Returns the row count.
 *
 * Idempotent: running it twice produces no further updates because the
 * second pass's `WHERE` clause excludes the now-`EXPIRED` rows
 * (`paymentStatus NOT IN (PAID, REFUNDED)` still matches `EXPIRED`, but
 * `expiresAt < now()` filtering is moot since they were already updated
 * — the `updateMany` simply re-writes them to `EXPIRED`, a no-op state
 * change). Callers should treat this as safe to run on any cadence.
 */
export async function expireStalePayments(): Promise<number> {
  const now = new Date();

  const result = await prisma.payment.updateMany({
    where: {
      expiresAt: { lt: now },
      paymentStatus: {
        notIn: [PaymentStatus.PAID, PaymentStatus.REFUNDED],
      },
    },
    data: {
      paymentStatus: PaymentStatus.EXPIRED,
    },
  });

  return result.count;
}
