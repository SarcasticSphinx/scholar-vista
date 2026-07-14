/**
 * Unit tests for the payment provider seam (`lib/payment/provider.ts`).
 *
 * Covers the pure, dependency-free surface of the seam:
 *   - `mockPaymentProvider.createCheckout` URL shape + 30-minute expiry.
 *   - `stripePaymentProvider.createCheckout` throwing (not-implemented stub).
 *   - `getPaymentProvider()` selection rules (explicit override wins;
 *     otherwise default to mock unless `STRIPE_SECRET_KEY` is set).
 *
 * These are co-located unit tests; the broader property suite lives with
 * its dedicated spec tasks.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CHECKOUT_TTL_MS,
  getPaymentProvider,
  mockPaymentProvider,
  stripePaymentProvider,
} from "./provider";

describe("mockPaymentProvider", () => {
  it("returns a placeholder URL keyed by the transaction id", async () => {
    const result = await mockPaymentProvider.createCheckout({
      applicationId: "app-1",
      amount: 49.99,
      transactionId: "txn-123",
    });

    expect(result.transactionId).toBe("txn-123");
    expect(result.url).toBe("/checkout/txn-123/placeholder");
  });

  it("sets a 30-minute expiry from now", async () => {
    const before = Date.now();
    const result = await mockPaymentProvider.createCheckout({
      applicationId: "app-1",
      amount: 10,
      transactionId: "txn-exp",
    });
    const after = Date.now();

    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + CHECKOUT_TTL_MS,
    );
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      after + CHECKOUT_TTL_MS,
    );
  });

  it("synthesises a transaction id when none is supplied", async () => {
    const result = await mockPaymentProvider.createCheckout({
      applicationId: "app-1",
      amount: 5,
      transactionId: "",
    });

    expect(result.transactionId).toMatch(/[0-9a-f-]{36}/i);
    expect(result.url).toBe(`/checkout/${result.transactionId}/placeholder`);
  });
});

describe("stripePaymentProvider", () => {
  it("throws not-implemented until the real integration is wired in", async () => {
    await expect(
      stripePaymentProvider.createCheckout({
        applicationId: "app-1",
        amount: 10,
        transactionId: "txn-1",
      }),
    ).rejects.toThrow(/not wired up/i);
  });
});

describe("getPaymentProvider", () => {
  const originalProvider = process.env.PAYMENT_PROVIDER;
  const originalKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = originalProvider;
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });

  it("defaults to the mock when STRIPE_SECRET_KEY is unset", () => {
    expect(getPaymentProvider().name).toBe("mock");
  });

  it("selects Stripe when STRIPE_SECRET_KEY is set and no override is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    expect(getPaymentProvider().name).toBe("stripe");
  });

  it("honours an explicit PAYMENT_PROVIDER=stripe override", () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(getPaymentProvider().name).toBe("stripe");
  });

  it("honours an explicit PAYMENT_PROVIDER=mock override even when a key is set", () => {
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    expect(getPaymentProvider().name).toBe("mock");
  });

  it("falls back to the mock for an unknown PAYMENT_PROVIDER value", () => {
    process.env.PAYMENT_PROVIDER = "paypal";
    expect(getPaymentProvider().name).toBe("mock");
  });
});
