/**
 * Payment webhook utilities.
 *
 * The webhook endpoint accepts two shapes — a Stripe-style envelope for the
 * production provider seam and a "mock" envelope used in development before
 * Stripe is wired up (the mock provider in `lib/payment/provider.ts` does
 * not sign requests). The functions in this module exist to keep the
 * route handler thin and focused on database mutations.
 *
 * Security model:
 *   - In production (`STRIPE_WEBHOOK_SECRET` set), the route handler MUST
 *     verify the `Stripe-Signature` header against the raw request body
 *     using HMAC-SHA256. A mismatch returns 400.
 *   - In dev/test (`STRIPE_WEBHOOK_SECRET` unset OR an explicit mock
 *     header/query is present), we accept JSON of the shape
 *     `{ transactionId, status: "PAID" | "FAILED" }` so the local payment
 *     placeholder page can drive the flow end-to-end.
 *
 * Supported Stripe event types (subset):
 *   - `payment_intent.succeeded` → mark Payment as PAID
 *   - `payment_intent.payment_failed` → mark Payment as FAILED
 *
 * The verification routine is a faithful port of Stripe's documented
 * signature scheme (`t=...,v1=...`). We avoid a runtime dependency on the
 * `stripe` package so the webhook stays usable in environments where the
 * SDK isn't installed yet.
 *
 * Validates: Requirements 30.3, 30.4.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Discriminated union describing the normalised webhook outcome. */
export type WebhookEvent =
  | { kind: "payment_succeeded"; transactionId: string }
  | { kind: "payment_failed"; transactionId: string; reason?: string }
  | { kind: "ignored"; type: string };

/** Tolerance window (in seconds) for the timestamp anti-replay check. */
const STRIPE_TOLERANCE_SECONDS = 5 * 60; // 5 minutes (Stripe default).

/**
 * Verify a Stripe `Stripe-Signature` header against the raw request body.
 *
 * The header looks like: `t=<timestamp>,v1=<signature>` (extra schemes may
 * appear and are ignored). We compute `HMAC_SHA256(secret, t + "." + body)`
 * and compare in constant time against the `v1` value.
 *
 * Returns `true` only when at least one `v1` signature matches AND the
 * timestamp is within the tolerance window. Any malformed header or
 * timestamp mismatch returns `false`.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  const sigs: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || value === undefined) continue;
    if (key === "t") {
      const n = Number(value);
      if (Number.isFinite(n)) timestamp = n;
    } else if (key === "v1") {
      sigs.push(value);
    }
  }

  if (timestamp === null || sigs.length === 0) return false;
  if (Math.abs(now - timestamp) > STRIPE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  for (const sig of sigs) {
    let candidateBuf: Buffer;
    try {
      candidateBuf = Buffer.from(sig, "hex");
    } catch {
      continue;
    }
    if (
      candidateBuf.length === expectedBuf.length &&
      timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Parse a Stripe-style event payload into a normalised `WebhookEvent`.
 *
 * Accepts the typical Stripe envelope `{ type, data: { object: {...} } }`
 * and extracts the transaction id from the `payment_intent`'s `id` or
 * `metadata.transactionId` (we set the latter when creating the
 * checkout in `actions/payment.ts`, so it survives even if Stripe issues
 * its own id).
 */
export function parseStripeEvent(payload: unknown): WebhookEvent {
  if (typeof payload !== "object" || payload === null) {
    return { kind: "ignored", type: "invalid" };
  }
  const event = payload as {
    type?: unknown;
    data?: { object?: unknown };
  };
  const type = typeof event.type === "string" ? event.type : "";
  const obj =
    event.data && typeof event.data === "object"
      ? (event.data.object as Record<string, unknown> | undefined)
      : undefined;

  const transactionId = extractTransactionId(obj);

  if (type === "payment_intent.succeeded" && transactionId) {
    return { kind: "payment_succeeded", transactionId };
  }
  if (type === "payment_intent.payment_failed" && transactionId) {
    const reasonCandidate =
      (obj?.last_payment_error as { message?: unknown } | undefined)?.message;
    const reason =
      typeof reasonCandidate === "string" ? reasonCandidate : undefined;
    return { kind: "payment_failed", transactionId, reason };
  }
  return { kind: "ignored", type: type || "unknown" };
}

/**
 * Parse the dev-mode mock envelope `{ transactionId, status }`.
 */
export function parseMockEvent(payload: unknown): WebhookEvent {
  if (typeof payload !== "object" || payload === null) {
    return { kind: "ignored", type: "invalid" };
  }
  const p = payload as { transactionId?: unknown; status?: unknown };
  if (typeof p.transactionId !== "string" || p.transactionId.length === 0) {
    return { kind: "ignored", type: "invalid" };
  }
  if (p.status === "PAID") {
    return { kind: "payment_succeeded", transactionId: p.transactionId };
  }
  if (p.status === "FAILED") {
    return { kind: "payment_failed", transactionId: p.transactionId };
  }
  return { kind: "ignored", type: `mock:${String(p.status)}` };
}

function extractTransactionId(
  obj: Record<string, unknown> | undefined,
): string | null {
  if (!obj) return null;
  const meta = obj.metadata as Record<string, unknown> | undefined;
  const fromMeta =
    meta && typeof meta.transactionId === "string"
      ? meta.transactionId
      : undefined;
  if (fromMeta && fromMeta.length > 0) return fromMeta;
  if (typeof obj.id === "string" && obj.id.length > 0) return obj.id;
  return null;
}
