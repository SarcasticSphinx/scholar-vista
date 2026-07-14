/**
 * My Applied Scholarships tracking page.
 *
 * Authenticated server component listing every application submitted by
 * the current user, sorted by `createdAt desc`. Each row renders:
 *   - Scholarship title linking to the public detail page.
 *   - The application date (Intl-formatted via `formatDate`).
 *   - A status badge that pairs colour with a text label so the status is
 *     not conveyed by colour alone (Req 12.4 / WCAG 1.4.1 — non-text
 *     contrast AA).
 *   - Admin feedback verbatim when present (Req 12.3).
 *   - A payment status badge when the scholarship's `fees > 0` (Req 30.6).
 *
 * Data flow:
 *   1. Resolve the session via `requireSession` (the parent layout already
 *      gates the route, but we read the user id here without prop-drilling).
 *   2. Parse the `?page` query parameter defensively, defaulting to 1.
 *   3. Fetch via `listApplicationsByUser(userId, page, 12)` which clamps
 *      to the available range.
 *   4. Render a list with status + payment badges, or an `EmptyState`
 *      pointing the user to `/scholarships` (Req 12.5).
 *
 * Caching:
 *   - Per-user data — opt out of caching with `dynamic = "force-dynamic"`.
 *     `actions/application.ts` already calls `revalidatePath('/my-applications')`
 *     after writes so the list reflects the latest server state.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 30.6
 *           (paginated listing — Req 5.11 via `listApplicationsByUser`).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { ApplicationStatus, PaymentStatus } from "@/generated/prisma/client";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listApplicationsByUser } from "@/lib/queries/application";
import type { MyApplicationDTO } from "@/lib/queries/dto";
import { formatDate } from "@/lib/intl";
import { requireSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** Per-user data: never cached at build time. */
export const dynamic = "force-dynamic";

/** Fixed page size for the My Applications list (Req 12.1, 5.11). */
const PAGE_SIZE = 12;

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "My Applied Scholarships | ScholarVista",
        description:
            "Track the status of every scholarship application you've submitted on ScholarVista.",
        path: "/my-applications",
    });
}

/* ------------------------------------------------------------------ */
/* Param parsing                                                       */
/* ------------------------------------------------------------------ */

/**
 * Coerce a `searchParams` entry into a single string. Arrays (duplicate
 * keys) collapse to their first value; missing values become an empty
 * string so callers can always trim.
 */
function firstParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
}

/** Parse the `page` URL param to a positive integer, defaulting to 1. */
function parsePage(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return parsed;
}

/* ------------------------------------------------------------------ */
/* Status presentation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Map an {@link ApplicationStatus} to:
 *   - a Tailwind colour-and-text class pair providing the colour cue
 *     (Req 12.4) — the same Tailwind tokens deliver matching dark-mode
 *     contrast.
 *   - a human-readable label rendered inside the badge so the status is
 *     announced verbatim by assistive tech and remains understandable to
 *     users who cannot perceive the colour (Req 12.4 / WCAG 1.4.1).
 */
const STATUS_PRESENTATION: Record<
    ApplicationStatus,
    { label: string; classes: string }
> = {
    [ApplicationStatus.PENDING]: {
        label: "Pending",
        // Yellow — awaiting initial review.
        classes:
            "bg-yellow-100 text-yellow-900 ring-1 ring-inset ring-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-200 dark:ring-yellow-500/40",
    },
    [ApplicationStatus.PROCESSING]: {
        label: "Processing",
        // Blue — currently under review.
        classes:
            "bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:ring-blue-500/40",
    },
    [ApplicationStatus.COMPLETED]: {
        label: "Completed",
        // Green — terminal positive outcome.
        classes:
            "bg-green-100 text-green-900 ring-1 ring-inset ring-green-300 dark:bg-green-500/20 dark:text-green-200 dark:ring-green-500/40",
    },
    [ApplicationStatus.REJECTED]: {
        label: "Rejected",
        // Red — terminal negative outcome.
        classes:
            "bg-red-100 text-red-900 ring-1 ring-inset ring-red-300 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-500/40",
    },
};

/**
 * Render a status pill that pairs colour with a text label.
 *
 * Implementation notes:
 *   - The colour token is supplied via `className` rather than a Badge
 *     `variant` so the four enum values map 1:1 to a recognisable hue.
 *   - The visible label and an `aria-label` use identical text so the
 *     status is surfaced both visually and to assistive tech.
 *
 * Validates: Requirement 12.4.
 */
function ApplicationStatusBadge({
    status,
}: {
    status: ApplicationStatus;
}) {
    const { label, classes } = STATUS_PRESENTATION[status];
    return (
        <Badge
            variant="outline"
            className={cn("border-transparent font-medium", classes)}
            aria-label={`Application status: ${label}`}
        >
            {label}
        </Badge>
    );
}

/* ------------------------------------------------------------------ */
/* Payment presentation                                                */
/* ------------------------------------------------------------------ */

const PAYMENT_PRESENTATION: Record<
    PaymentStatus,
    { label: string; classes: string }
> = {
    [PaymentStatus.UNPAID]: {
        label: "Payment due",
        classes:
            "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/40",
    },
    [PaymentStatus.PAID]: {
        label: "Payment received",
        classes:
            "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/40",
    },
    [PaymentStatus.REFUNDED]: {
        label: "Payment refunded",
        classes:
            "bg-slate-100 text-slate-900 ring-1 ring-inset ring-slate-300 dark:bg-slate-500/20 dark:text-slate-200 dark:ring-slate-500/40",
    },
    [PaymentStatus.FAILED]: {
        label: "Payment failed",
        classes:
            "bg-red-100 text-red-900 ring-1 ring-inset ring-red-300 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-500/40",
    },
    [PaymentStatus.EXPIRED]: {
        label: "Payment expired",
        classes:
            "bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-300 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/40",
    },
};

/**
 * Pill that summarises the payment state for an application that requires
 * a fee. Only rendered when the underlying scholarship has `fees > 0`
 * (Req 30.6).
 */
function PaymentStatusBadge({
    status,
}: {
    status: PaymentStatus;
}) {
    const { label, classes } = PAYMENT_PRESENTATION[status];
    return (
        <Badge
            variant="outline"
            className={cn("border-transparent font-medium", classes)}
            aria-label={`Payment status: ${label}`}
        >
            {label}
        </Badge>
    );
}

/* ------------------------------------------------------------------ */
/* Application row                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse the Decimal-as-string `fees` field into a number. Returns `0` for
 * any non-finite value so the "fees > 0" gate behaves conservatively.
 */
function feesAsNumber(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

interface ApplicationRowProps {
    application: MyApplicationDTO;
}

/**
 * Single application row. Rendered inside an `<li>` so the surrounding
 * list keeps semantic meaning. Layout is responsive — the badges/date
 * stack below the title on narrow viewports and align to the right at
 * `sm:`.
 */
function ApplicationRow({ application }: ApplicationRowProps) {
    const { scholarship, status, paymentStatus, feedback, createdAt } =
        application;
    const detailHref = `/scholarships/${scholarship.id}`;
    const fees = feesAsNumber(scholarship.fees);
    const requiresPayment = fees > 0;
    const formattedDate = formatDate(createdAt, undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <Card data-slot="my-application-row">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <Link
                            href={detailHref}
                            className="block text-base font-semibold leading-snug tracking-tight outline-none transition-colors hover:text-primary focus-visible:text-primary"
                        >
                            <span className="line-clamp-2">
                                {scholarship.title}
                            </span>
                        </Link>
                        <p className="truncate text-sm text-muted-foreground">
                            {scholarship.university.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            <span className="sr-only">Applied on </span>
                            Applied{" "}
                            <time dateTime={createdAt}>{formattedDate}</time>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                        <ApplicationStatusBadge status={status} />
                        {requiresPayment ? (
                            <PaymentStatusBadge status={paymentStatus} />
                        ) : null}
                    </div>
                </div>

                {feedback ? (
                    <div
                        className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                        aria-label="Administrator feedback"
                    >
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Admin feedback
                        </p>
                        <p className="whitespace-pre-line text-foreground">
                            {feedback}
                        </p>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface MyApplicationsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MyApplicationsPage({
    searchParams,
}: MyApplicationsPageProps) {
    const session = await requireSession();
    const params = await searchParams;
    const page = parsePage(firstParam(params.page));

    const result = await listApplicationsByUser(
        session.user.id,
        page,
        PAGE_SIZE,
    );

    const hasResults = result.items.length > 0;
    const headingId = "my-applications-heading";

    return (
        <section
            aria-labelledby={headingId}
            className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <header className="mb-6 space-y-1">
                <h1
                    id={headingId}
                    className="text-3xl font-semibold tracking-tight"
                >
                    My Applied Scholarships
                </h1>
                <p className="text-sm text-muted-foreground">
                    Track the status of every scholarship application you&apos;ve
                    submitted. Updates from the review team appear here as
                    soon as they&apos;re posted.
                </p>
            </header>

            <p className="sr-only" aria-live="polite">
                {hasResults
                    ? `Showing ${result.items.length} of ${result.total} applications`
                    : "You have not submitted any applications yet"}
            </p>

            {hasResults ? (
                <ul role="list" className="flex flex-col gap-4">
                    {result.items.map((application) => (
                        <li key={application.id}>
                            <ApplicationRow application={application} />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="No applications yet"
                    description="You haven't applied to any scholarships. Browse the catalog to find opportunities that match your goals."
                    icon={ClipboardList}
                    action={{
                        label: "Browse scholarships",
                        href: "/scholarships",
                    }}
                />
            )}

            {hasResults && result.totalPages > 1 ? (
                <div className="mt-10">
                    <Pagination
                        currentPage={result.page}
                        totalPages={result.totalPages}
                        baseUrl="/my-applications"
                    />
                </div>
            ) : null}
        </section>
    );
}
