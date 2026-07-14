/**
 * Mock payment-provider placeholder page.
 *
 * The dev-only `mockPaymentProvider` (see `lib/payment/provider.ts`)
 * issues redirect URLs of the form `/checkout/{transactionId}/placeholder`.
 * This page stands in for a real Stripe Checkout screen and gives the
 * developer two buttons:
 *
 *   - **Pay** → invokes `confirmMockPayment(transactionId)`, which marks
 *     the `Payment` and linked `Application` as `PAID`, sets
 *     `Application.status = PENDING`, and emits a `PAYMENT_CONFIRMED`
 *     notification (Req 30.3, 33.1). On success the page redirects to
 *     `/my-applications`.
 *
 *   - **Cancel** → invokes `cancelMockPayment(transactionId)`, which
 *     marks both rows as `FAILED` so the UI can surface a retry path
 *     (Req 30.4).
 *
 * The route is intentionally inside the `(public)` group: redirects from
 * the (currently fake) provider must not be auth-walled at the
 * middleware level. Server-side, however, we still resolve the session
 * and reject mismatched ownership so a logged-out browser cannot poke
 * `/checkout/{anyone-elses-txnId}/placeholder`.
 *
 * Behaviour matrix (renders text varies, action availability does not):
 *   - No session            → "Please sign in to complete payment".
 *   - Wrong owner           → `notFound()` (404 — same as bogus txn id).
 *   - `paymentStatus=PAID`  → "Already paid" + link to `/my-applications`.
 *   - `paymentStatus=FAILED`/`EXPIRED`/`REFUNDED` → status banner + link.
 *   - Expired by clock      → expired banner + retry link.
 *   - Otherwise (UNPAID)    → renders the Pay / Cancel form.
 *
 * Validates: Requirements 30.1, 30.2, 30.3, 30.4.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleDollarSign, Clock4, XCircle } from "lucide-react";

import { PaymentStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { getOptionalSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency, formatDate } from "@/lib/intl";

import { MockCheckoutForm } from "./mock-checkout-form";

/** Live data: never cached at build time. */
export const dynamic = "force-dynamic";

interface PlaceholderPageProps {
    params: Promise<{ transactionId: string }>;
}

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "Mock checkout | ScholarVista",
        description:
            "Development placeholder page that simulates a payment-provider checkout for a scholarship application.",
        path: "/checkout",
    });
}

export default async function PlaceholderCheckoutPage({
    params,
}: PlaceholderPageProps) {
    const { transactionId } = await params;

    if (!transactionId) {
        notFound();
    }

    // Optional session — we render an unauthenticated banner instead of
    // forcing a redirect so the placeholder page can also serve as a
    // landing page for users whose session expired between checkout
    // initiation and arrival here.
    const session = await getOptionalSession();

    const payment = await prisma.payment.findUnique({
        where: { transactionId },
        select: {
            id: true,
            userId: true,
            applicationId: true,
            paymentStatus: true,
            amount: true,
            expiresAt: true,
            createdAt: true,
            scholarship: {
                select: { id: true, title: true, university: { select: { name: true } } },
            },
        },
    });

    // 404 the route for unknown txn ids — they are not enumerable, and
    // 404'ing avoids leaking which transaction ids exist.
    if (!payment) {
        notFound();
    }

    // 404 the route when the caller does not own the payment row. We
    // intentionally use 404 (not 403) so we don't leak existence.
    if (!session || payment.userId !== session.user.id) {
        if (!session) {
            return (
                <PlaceholderShell title={payment.scholarship?.title ?? null}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Sign in to complete payment</CardTitle>
                            <CardDescription>
                                Your session has expired. Sign in again to confirm or cancel
                                this checkout.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link
                                    href={`/sign-in?returnUrl=/checkout/${transactionId}/placeholder`}
                                >
                                    Sign in
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </PlaceholderShell>
            );
        }
        notFound();
    }

    const amountNumber = Number(payment.amount.toString());
    const expired = isCheckoutExpired(payment.expiresAt);

    return (
        <PlaceholderShell title={payment.scholarship?.title ?? null}>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CircleDollarSign
                            aria-hidden="true"
                            className="size-5 text-muted-foreground"
                        />
                        <CardTitle>Mock payment provider</CardTitle>
                    </div>
                    <CardDescription>
                        This screen stands in for the real payment provider during
                        development. No card details are collected and no money moves.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground">Scholarship</dt>
                            <dd className="font-medium">
                                {payment.scholarship?.title ?? "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">University</dt>
                            <dd className="font-medium">
                                {payment.scholarship?.university?.name ?? "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Amount</dt>
                            <dd className="font-medium">
                                {formatCurrency(amountNumber, "USD")}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Transaction</dt>
                            <dd className="font-mono text-xs break-all">
                                {transactionId}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Created</dt>
                            <dd>
                                <time dateTime={payment.createdAt.toISOString()}>
                                    {formatDate(payment.createdAt)}
                                </time>
                            </dd>
                        </div>
                        {payment.expiresAt && (
                            <div>
                                <dt className="text-muted-foreground">Expires</dt>
                                <dd className="flex items-center gap-1.5">
                                    <Clock4
                                        aria-hidden="true"
                                        className="size-3.5 text-muted-foreground"
                                    />
                                    <time dateTime={payment.expiresAt.toISOString()}>
                                        {formatDate(payment.expiresAt)}
                                    </time>
                                </dd>
                            </div>
                        )}
                    </dl>

                    <StatusSection
                        status={payment.paymentStatus}
                        expired={expired}
                    />

                    {/* Only render the action form when the row is actionable. */}
                    {payment.paymentStatus === PaymentStatus.UNPAID && !expired && (
                        <MockCheckoutForm transactionId={transactionId} />
                    )}
                </CardContent>
            </Card>
        </PlaceholderShell>
    );
}

/* ------------------------------------------------------------------ */
/*                            sub-components                            */
/* ------------------------------------------------------------------ */

/**
 * Whether a checkout's `expiresAt` deadline has passed. Kept at module
 * scope so the clock read happens outside component render (the page is
 * `force-dynamic`, so each request re-evaluates this).
 */
function isCheckoutExpired(expiresAt: Date | null): boolean {
    return expiresAt !== null && expiresAt.getTime() < Date.now();
}

function PlaceholderShell({
    title,
    children,
}: {
    title: string | null;
    children: React.ReactNode;
}) {
    return (
        <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
            <header className="mb-6 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                    Checkout
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                    {title ?? "Confirm your payment"}
                </h1>
            </header>
            {children}
        </section>
    );
}

function StatusSection({
    status,
    expired,
}: {
    status: PaymentStatus;
    expired: boolean;
}) {
    if (status === PaymentStatus.PAID) {
        return (
            <div
                role="status"
                className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-100"
            >
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4" />
                <div className="space-y-1">
                    <p className="font-medium">Payment received</p>
                    <p>
                        This payment is already confirmed.{" "}
                        <Link
                            href="/my-applications"
                            className="underline underline-offset-2"
                        >
                            View my applications
                        </Link>
                        .
                    </p>
                </div>
            </div>
        );
    }

    if (status === PaymentStatus.FAILED) {
        return (
            <div
                role="status"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
                <XCircle aria-hidden="true" className="mt-0.5 size-4 text-destructive" />
                <div className="space-y-1">
                    <p className="font-medium">Payment cancelled</p>
                    <p className="text-muted-foreground">
                        You can{" "}
                        <Link
                            href="/my-applications"
                            className="underline underline-offset-2"
                        >
                            retry payment
                        </Link>{" "}
                        from your applications page without re-entering your application
                        details.
                    </p>
                </div>
            </div>
        );
    }

    if (status === PaymentStatus.EXPIRED || expired) {
        return (
            <div
                role="status"
                className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100"
            >
                <Clock4 aria-hidden="true" className="mt-0.5 size-4" />
                <div className="space-y-1">
                    <p className="font-medium">Checkout expired</p>
                    <p>
                        This checkout link is no longer valid. Start a new payment from{" "}
                        <Link
                            href="/my-applications"
                            className="underline underline-offset-2"
                        >
                            your applications
                        </Link>
                        .
                    </p>
                </div>
            </div>
        );
    }

    if (status === PaymentStatus.REFUNDED) {
        return (
            <div role="status" className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">Refunded</Badge>
                <span className="text-muted-foreground">
                    This payment has been refunded.
                </span>
            </div>
        );
    }

    return null;
}
