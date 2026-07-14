/**
 * Payment provider seam.
 *
 * ScholarVista talks to its payment processor through a single
 * `PaymentProvider` interface (the "seam"). The Server Action layer
 * (`actions/payment.ts`) only ever references this interface, so swapping
 * the development mock for a real Stripe integration is a one-line change
 * inside `getPaymentProvider()` — no callers need to change.
 *
 * Two implementations live alongside the interface:
 *
 *   - {@link mockPaymentProvider} — the default for development. Produces
 *     deterministic, in-process checkout URLs of the form
 *     `/checkout/{transactionId}/placeholder` so the multi-step
 *     application flow can be exercised end-to-end without a real
 *     processor. The placeholder page (`app/(public)/checkout/[transactionId]/placeholder/page.tsx`)
 *     simulates the provider's Pay/Cancel buttons.
 *
 *   - {@link stripePaymentProvider} — a stub for the real Stripe Checkout
 *     integration. Method bodies are commented `TODO`s so the seam compiles
 *     and is exercisable today; flipping `PAYMENT_PROVIDER=stripe` will
 *     light up the real flow once the SDK call is wired in.
 *
 * `getPaymentProvider()` selects the provider based on
 * `process.env.PAYMENT_PROVIDER` and falls back to the mock so local
 * development never requires Stripe credentials.
 *
 * Validates: design.md "Payment Processing", Requirements 30.1, 30.2, 30.3, 30.4.
 */

import { randomUUID } from "node:crypto";

/** 30-minute checkout expiry (Req 30.5, design.md "Payment Processing"). */
export const CHECKOUT_TTL_MS = 30 * 60 * 1000;

/** Input contract every provider must accept. */
export interface CreateCheckoutInput {
  /**
   * Application id the checkout is paying for. Carried through to the
   * provider so the webhook (or, for the mock, the placeholder page) can
   * resolve the application that should be marked `PAID`.
   */
  applicationId: string;
  /**
   * Charge amount, expressed in the scholarship's `fees` decimal. Providers
   * are responsible for rounding/conversion to their wire format
   * (e.g. Stripe's integer cents).
   */
  amount: number;
  /** ISO currency code (e.g. `"USD"`). Defaults to `"USD"` if omitted. */
  currency?: string;
  /**
   * Stable, server-generated transaction id (also persisted as
   * `Payment.transactionId`). Passing this in keeps the DB row and the
   * provider's record consistent even if the provider call fails before
   * returning.
   */
  transactionId: string;
}

/** Output contract every provider must return from `createCheckout`. */
export interface CreateCheckoutResult {
  /** Redirect URL the client should send the user to. */
  url: string;
  /** Echo of the input transaction id. */
  transactionId: string;
  /** Wall-clock timestamp at which the checkout token expires. */
  expiresAt: Date;
}

/**
 * Provider-agnostic seam. The Server Action layer depends only on this
 * type so providers stay swappable.
 */
export interface PaymentProvider {
  /** Identifier surfaced in logs / debug UIs. */
  readonly name: string;
  /** Create a checkout session and return a redirect URL. */
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
}

/* ------------------------------------------------------------------ */
/*                            mock provider                            */
/* ------------------------------------------------------------------ */

/**
 * Development-only mock provider. Returns a fully in-process placeholder
 * URL so the application + payment flow can be exercised without
 * configuring Stripe credentials.
 *
 * The URL shape (`/checkout/{transactionId}/placeholder`) is part of the
 * mock's contract — `app/(public)/checkout/[transactionId]/placeholder/page.tsx`
 * relies on it to look the `Payment` row up by `transactionId`.
 */
export const mockPaymentProvider: PaymentProvider = {
  name: "mock",
  async createCheckout(input) {
    const transactionId = input.transactionId || randomUUID();
    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
    return {
      url: `/checkout/${transactionId}/placeholder`,
      transactionId,
      expiresAt,
    };
  },
};

/* ------------------------------------------------------------------ */
/*                          stripe provider stub                       */
/* ------------------------------------------------------------------ */

/**
 * Stub Stripe-style adapter.
 *
 * This implementation intentionally throws so misconfigured environments
 * fail fast instead of silently downgrading to the mock. The real
 * integration is left as a TODO so the seam compiles today; once the
 * Stripe SDK call is wired in, callers don't need to change.
 */
export const stripePaymentProvider: PaymentProvider = {
  name: "stripe",
  async createCheckout(_input) {
    // TODO(stripe): real integration.
    //
    //   import Stripe from "stripe";
    //   const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: "..." });
    //   const session = await stripe.checkout.sessions.create({
    //     mode: "payment",
    //     payment_method_types: ["card"],
    //     line_items: [{
    //       price_data: {
    //         currency: _input.currency ?? "usd",
    //         product_data: { name: `Scholarship application ${_input.applicationId}` },
    //         unit_amount: Math.round(_input.amount * 100),
    //       },
    //       quantity: 1,
    //     }],
    //     client_reference_id: _input.applicationId,
    //     metadata: { transactionId: _input.transactionId },
    //     expires_at: Math.floor((Date.now() + CHECKOUT_TTL_MS) / 1000),
    //     success_url: `${env.NEXT_PUBLIC_APP_URL}/my-applications?payment=success`,
    //     cancel_url:  `${env.NEXT_PUBLIC_APP_URL}/my-applications?payment=cancel`,
    //   });
    //   return {
    //     url: session.url!,
    //     transactionId: _input.transactionId,
    //     expiresAt: new Date(session.expires_at * 1000),
    //   };

    throw new Error(
      "stripePaymentProvider is not wired up yet. " +
        "Set PAYMENT_PROVIDER=mock or implement the TODO in lib/payment/provider.ts.",
    );
  },
};

/* ------------------------------------------------------------------ */
/*                       provider selection helper                     */
/* ------------------------------------------------------------------ */

/**
 * Resolve the configured `PaymentProvider` from the environment.
 *
 * Selection rules (in order):
 *
 *   1. An explicit `PAYMENT_PROVIDER` env var always wins:
 *        - `stripe` → {@link stripePaymentProvider}
 *        - `mock`   → {@link mockPaymentProvider}
 *      Unknown values fall back to the mock so a typo doesn't accidentally
 *      activate Stripe in development.
 *   2. With no explicit override, the provider is chosen by credential
 *      presence: Stripe is selected only when `STRIPE_SECRET_KEY` is set;
 *      otherwise we default to the mock. This keeps local development
 *      credential-free (Req 30.1–30.4) — the mock is the default whenever
 *      `STRIPE_SECRET_KEY` is unset.
 */
export function getPaymentProvider(): PaymentProvider {
  const override = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (override === "stripe") return stripePaymentProvider;
  if (override === "mock") return mockPaymentProvider;

  // No explicit override: default to mock unless Stripe is configured.
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  return stripeKey ? stripePaymentProvider : mockPaymentProvider;
}
