/**
 * POST /api/webhooks/payment
 *
 * Payment provider webhook receiver. Handles two transport shapes:
 *
 *   1. **Stripe-style** — when `STRIPE_WEBHOOK_SECRET` is configured, the
 *      route reads the raw request body, verifies the `Stripe-Signature`
 *      header against `STRIPE_WEBHOOK_SECRET`, then parses the standard
 *      Stripe event envelope (`payment_intent.succeeded` /
 *      `payment_intent.payment_failed`).
 *
 *   2. **Mock provider** — for local development without a real Stripe
 *      account. Triggered when `STRIPE_WEBHOOK_SECRET` is unset OR the
 *      caller supplies the dev-mode bypass header `x-mock-webhook: 1` (or
 *      `?mock=1`). Accepts JSON of the shape
 *      `{ transactionId: string, status: "PAID" | "FAILED" }`.
 *
 * Database mutations (run in a single Prisma transaction):
 *   - `payment_succeeded`:
 *       * `Payment.paymentStatus = PAID`
 *       * linked `Application.paymentStatus = PAID`
 *       * `Application.status = PENDING` only if it hasn't already advanced
 *         past PENDING (so admin actions aren't overwritten).
 *       * Insert a `PAYMENT_CONFIRMED` `Notification` for the user.
 *   - `payment_failed`:
 *       * `Payment.paymentStatus = FAILED`
 *
 * Response codes:
 *   - `200 { received: true }` — accepted (including ignored event types).
 *   - `400` — signature mismatch, bad JSON, or missing fields.
 *   - `404` — unknown `transactionId`.
 *   - `500` — DB / runtime error.
 *
 * Validates: Requirements 30.3, 30.4, 33.1.
 */

import { NextResponse } from "next/server";

import {
  ApplicationStatus,
  NotificationType,
  PaymentStatus,
} from "@/generated/prisma/client";
import { env } from "@/lib/env";
import {
  parseMockEvent,
  parseStripeEvent,
  verifyStripeSignature,
  type WebhookEvent,
} from "@/lib/payment/webhook";
import prisma from "@/lib/prisma";

// Stripe needs the raw body for signature verification; force Node so
// Prisma + crypto work, and disable any caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  // 1. Read the raw body once. We need the original bytes (not a re-
  //    serialised JSON) for Stripe signature verification.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json(
      { error: "Could not read request body" },
      { status: 400 },
    );
  }

  // 2. Decide which envelope we're handling.
  const url = new URL(req.url);
  const mockHeader = req.headers.get("x-mock-webhook");
  const mockQuery = url.searchParams.get("mock");
  const isMockRequest = mockHeader === "1" || mockQuery === "1";
  const stripeSignature = req.headers.get("stripe-signature");
  const useStripe = !!env.STRIPE_WEBHOOK_SECRET && !isMockRequest;

  let event: WebhookEvent;

  if (useStripe) {
    const ok = verifyStripeSignature(
      rawBody,
      stripeSignature,
      env.STRIPE_WEBHOOK_SECRET as string,
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }
    event = parseStripeEvent(parsed);
  } else {
    // Mock / dev mode: no signature, plain JSON body.
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }
    event = parseMockEvent(parsed);
  }

  // 3. Dispatch on the normalised event.
  try {
    if (event.kind === "ignored") {
      // Acknowledge unrelated events so the provider doesn't retry forever.
      return NextResponse.json({ received: true, ignored: event.type });
    }

    if (event.kind === "payment_failed") {
      const updated = await prisma.payment.updateMany({
        where: { transactionId: event.transactionId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      if (updated.count === 0) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ received: true });
    }

    // event.kind === "payment_succeeded"
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { transactionId: event.transactionId },
        select: {
          id: true,
          userId: true,
          applicationId: true,
          paymentStatus: true,
        },
      });
      if (!payment) return { found: false as const };

      // Idempotency: if already PAID, skip secondary writes but still 200.
      if (payment.paymentStatus === PaymentStatus.PAID) {
        return { found: true as const, alreadyPaid: true };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });

      if (payment.applicationId) {
        // Always mark `paymentStatus=PAID`. For `status`, only nudge to
        // PENDING when the application is still in its pre-payment state
        // — never overwrite admin progress
        // (PROCESSING/COMPLETED/REJECTED).
        await tx.application.update({
          where: { id: payment.applicationId },
          data: { paymentStatus: PaymentStatus.PAID },
        });
        await tx.application.updateMany({
          where: {
            id: payment.applicationId,
            status: { notIn: [ApplicationStatus.PROCESSING, ApplicationStatus.COMPLETED, ApplicationStatus.REJECTED] },
          },
          data: { status: ApplicationStatus.PENDING },
        });

        await tx.notification.create({
          data: {
            userId: payment.userId,
            type: NotificationType.PAYMENT_CONFIRMED,
            message: "Your payment was confirmed and your application is now pending review.",
            relatedEntityId: payment.applicationId,
          },
        });
      }

      return { found: true as const, alreadyPaid: false };
    });

    if (!result.found) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook:payment] handler error", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
