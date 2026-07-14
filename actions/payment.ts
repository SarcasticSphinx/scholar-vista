"use server";

/**
 * Payment Server Actions.
 *
 * Three entry points cover the full development-mode flow:
 *
 *   1. {@link initiateCheckout} — authenticated user starts a checkout
 *      for one of their applications. Creates a `Payment` row with
 *      `paymentStatus = UNPAID` and returns a redirect URL produced by
 *      the configured provider seam (`lib/payment/provider.ts`).
 *
 *   2. {@link confirmMockPayment} — invoked from the dev-only placeholder
 *      checkout page when the user clicks **Pay**. Marks the `Payment`
 *      and the linked `Application` as `PAID`, sets the application
 *      status to `PENDING`, and emits a `PAYMENT_CONFIRMED` notification
 *      (Req 30.3, 33.1).
 *
 *   3. {@link cancelMockPayment} — invoked from the placeholder page when
 *      the user clicks **Cancel**. Marks the `Payment` and `Application`
 *      as `FAILED` so the UI can surface a retry path (Req 30.4).
 *
 * The mock confirm/cancel actions stand in for the production Stripe
 * webhook (`app/api/webhooks/payment/route.ts`, future task). They share
 * the underlying state-transition logic so swapping providers does not
 * change downstream behaviour.
 *
 * Validates: Requirements 7.4, 30.1, 30.2, 30.3, 30.4, 33.1, 34.4.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  ApplicationStatus,
  NotificationType,
  PaymentStatus,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment/provider";
import { requireSession } from "@/lib/rbac";
import {
  fail,
  ok,
  prismaErrorToActionResult,
} from "@/lib/action-result";
import type { ActionResult } from "@/types/api";

export interface CheckoutResult {
  /** The generated `Payment.transactionId`. */
  transactionId: string;
  /** Provider-issued redirect URL (mock or Stripe, depending on env). */
  checkoutUrl: string;
  /** ISO timestamp at which the checkout token expires. */
  expiresAt: string;
}

/* ------------------------------------------------------------------ */
/*                            initiateCheckout                         */
/* ------------------------------------------------------------------ */

/**
 * Start a checkout session for the given application.
 *
 *   1. Authenticate the caller and load the application + linked
 *      scholarship.
 *   2. Verify the application belongs to the caller and the scholarship's
 *      `fees > 0` (no-op for free scholarships).
 *   3. Verify the `featurePaymentEnabled` feature flag is enabled
 *      (Req 34.4).
 *   4. Persist a `Payment` row with `paymentStatus = UNPAID` and a
 *      transient `expiresAt`.
 *   5. Delegate URL creation to `getPaymentProvider().createCheckout`,
 *      so the same Server Action serves both the dev mock and the
 *      production Stripe adapter.
 */
export async function initiateCheckout(
  applicationId: string,
): Promise<ActionResult<CheckoutResult>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<CheckoutResult>("UNAUTHORIZED", "Authentication required.");
  }

  if (!applicationId) {
    return fail<CheckoutResult>("VALIDATION", "Application id is required.");
  }

  try {
    // Feature-flag check before any DB work that could imply a charge.
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { featurePaymentEnabled: true },
    });
    if (settings && settings.featurePaymentEnabled === false) {
      return fail<CheckoutResult>(
        "FEATURE_DISABLED",
        "Payment processing is currently disabled.",
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        userId: true,
        scholarshipId: true,
        scholarship: { select: { fees: true } },
      },
    });

    if (!application) {
      return fail<CheckoutResult>("NOT_FOUND", "Application not found.");
    }

    if (application.userId !== session.user.id) {
      return fail<CheckoutResult>(
        "FORBIDDEN",
        "You can only initiate checkout for your own applications.",
      );
    }

    // `Decimal.toNumber()` is exact for this column (max 999_999.99 fits
    // a double); compare against zero to gate the "free scholarship" case.
    const feesNumber = Number(application.scholarship.fees.toString());
    if (!(feesNumber > 0)) {
      return fail<CheckoutResult>(
        "PAYMENT_REQUIRED",
        "This scholarship does not require payment.",
      );
    }

    // Generate the transaction id ourselves so the DB row and the
    // provider record share the same identifier even if the provider
    // call fails partway through.
    const transactionId = randomUUID();

    const checkout = await getPaymentProvider().createCheckout({
      applicationId: application.id,
      amount: feesNumber,
      transactionId,
    });

    await prisma.payment.create({
      data: {
        userId: session.user.id,
        scholarshipId: application.scholarshipId,
        applicationId: application.id,
        amount: application.scholarship.fees,
        transactionId: checkout.transactionId,
        paymentStatus: PaymentStatus.UNPAID,
        expiresAt: checkout.expiresAt,
      },
      select: { id: true },
    });

    return ok({
      transactionId: checkout.transactionId,
      checkoutUrl: checkout.url,
      expiresAt: checkout.expiresAt.toISOString(),
    });
  } catch (error) {
    return prismaErrorToActionResult<CheckoutResult>(error);
  }
}

/* ------------------------------------------------------------------ */
/*                  confirmMockPayment / cancelMockPayment             */
/* ------------------------------------------------------------------ */

/**
 * Look up the `Payment` row for a transaction id, asserting that:
 *   - it exists,
 *   - it belongs to the calling user,
 *   - it has not already reached a terminal state, and
 *   - it is linked to an `Application` (it always should be, but we
 *     defend against orphaned rows).
 */
async function loadOwnedPendingPayment(
  transactionId: string,
  userId: string,
): Promise<
  | {
      ok: true;
      payment: {
        id: string;
        applicationId: string;
        paymentStatus: PaymentStatus;
        expiresAt: Date | null;
      };
    }
  | { ok: false; result: ActionResult<{ applicationId: string }> }
> {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    select: {
      id: true,
      userId: true,
      applicationId: true,
      paymentStatus: true,
      expiresAt: true,
    },
  });

  if (!payment) {
    return {
      ok: false,
      result: fail<{ applicationId: string }>(
        "NOT_FOUND",
        "Payment not found.",
      ),
    };
  }

  if (payment.userId !== userId) {
    return {
      ok: false,
      result: fail<{ applicationId: string }>(
        "FORBIDDEN",
        "You can only act on your own payments.",
      ),
    };
  }

  if (!payment.applicationId) {
    return {
      ok: false,
      result: fail<{ applicationId: string }>(
        "INVALID_REFERENCE",
        "Payment is not linked to an application.",
      ),
    };
  }

  return {
    ok: true,
    payment: {
      id: payment.id,
      applicationId: payment.applicationId,
      paymentStatus: payment.paymentStatus,
      expiresAt: payment.expiresAt,
    },
  };
}

/**
 * Confirm a mock checkout — invoked by the dev placeholder page when the
 * user clicks **Pay**. Mirrors what the real Stripe webhook will do once
 * implemented:
 *
 *   - flips `Payment.paymentStatus` to `PAID`,
 *   - flips the linked `Application.paymentStatus` to `PAID` and sets
 *     `Application.status = PENDING` (Req 30.3),
 *   - emits a `PAYMENT_CONFIRMED` notification (Req 33.1).
 *
 * Idempotent: re-running on a `PAID` row is a no-op success so the
 * placeholder page can be safely refreshed.
 */
export async function confirmMockPayment(
  transactionId: string,
): Promise<ActionResult<{ applicationId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ applicationId: string }>(
      "UNAUTHORIZED",
      "Authentication required.",
    );
  }

  if (!transactionId) {
    return fail<{ applicationId: string }>(
      "VALIDATION",
      "Transaction id is required.",
    );
  }

  try {
    const lookup = await loadOwnedPendingPayment(
      transactionId,
      session.user.id,
    );
    if (!lookup.ok) return lookup.result;
    const { payment } = lookup;

    // Idempotent: already-paid → success.
    if (payment.paymentStatus === PaymentStatus.PAID) {
      return ok({ applicationId: payment.applicationId });
    }

    // Reject confirms on terminal-failure rows.
    if (
      payment.paymentStatus === PaymentStatus.FAILED ||
      payment.paymentStatus === PaymentStatus.EXPIRED ||
      payment.paymentStatus === PaymentStatus.REFUNDED
    ) {
      return fail<{ applicationId: string }>(
        "INVALID_TRANSITION",
        `Cannot confirm a payment in ${payment.paymentStatus} state.`,
      );
    }

    // Treat an `expiresAt` in the past as expired (Req 30.5).
    if (payment.expiresAt && payment.expiresAt.getTime() < Date.now()) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.EXPIRED },
      });
      return fail<{ applicationId: string }>(
        "PAYMENT_EXPIRED",
        "This checkout has expired. Please initiate a new payment.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await tx.application.update({
        where: { id: payment.applicationId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: ApplicationStatus.PENDING,
        },
      });
      await tx.notification.create({
        data: {
          userId: session.user.id,
          type: NotificationType.PAYMENT_CONFIRMED,
          message: "Your payment was received and your application is now pending review.",
          relatedEntityId: payment.applicationId,
        },
      });
    });

    revalidatePath("/my-applications");
    return ok({ applicationId: payment.applicationId });
  } catch (error) {
    return prismaErrorToActionResult<{ applicationId: string }>(error);
  }
}

/**
 * Cancel a mock checkout — invoked by the dev placeholder page when the
 * user clicks **Cancel**. Marks the payment and the linked application
 * as `FAILED` so the UI can offer a retry without losing the application
 * data (Req 30.4). Idempotent: cancelling a `FAILED` row is a no-op.
 */
export async function cancelMockPayment(
  transactionId: string,
): Promise<ActionResult<{ applicationId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail<{ applicationId: string }>(
      "UNAUTHORIZED",
      "Authentication required.",
    );
  }

  if (!transactionId) {
    return fail<{ applicationId: string }>(
      "VALIDATION",
      "Transaction id is required.",
    );
  }

  try {
    const lookup = await loadOwnedPendingPayment(
      transactionId,
      session.user.id,
    );
    if (!lookup.ok) return lookup.result;
    const { payment } = lookup;

    // Idempotent.
    if (payment.paymentStatus === PaymentStatus.FAILED) {
      return ok({ applicationId: payment.applicationId });
    }

    // Cannot cancel an already-paid (or refunded) charge.
    if (
      payment.paymentStatus === PaymentStatus.PAID ||
      payment.paymentStatus === PaymentStatus.REFUNDED
    ) {
      return fail<{ applicationId: string }>(
        "INVALID_TRANSITION",
        `Cannot cancel a payment in ${payment.paymentStatus} state.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      await tx.application.update({
        where: { id: payment.applicationId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
    });

    revalidatePath("/my-applications");
    return ok({ applicationId: payment.applicationId });
  } catch (error) {
    return prismaErrorToActionResult<{ applicationId: string }>(error);
  }
}
