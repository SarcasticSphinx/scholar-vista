/**
 * My Reviews page.
 *
 * Server-rendered list of every review the authenticated user has posted,
 * paginated 12/page and ordered by `createdAt desc`. Each row shows:
 *   - the scholarship title (linked to its detail page)
 *   - the rating as a 5-star bar (with screen-reader label)
 *   - the review comment
 *   - the submission date
 *
 * Empty state: a helper card pointing the user back at the catalogue when
 * they have no reviews yet.
 *
 * Pagination uses the shared `<Pagination>` component which preserves
 * existing search params; here only `?page=` is meaningful.
 *
 * Validates: Requirements 6.3, 10.1, 10.2, 10.4, 10.5, 10.6.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareText, Star } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listReviewsByUser } from "@/lib/queries/review";
import { requireSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/intl";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

interface MyReviewsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Coerce `searchParams[key]` into a single string. */
function firstParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
}

/** Parse a positive 1-indexed page integer from a search param. */
function parsePage(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return parsed;
}

export const metadata: Metadata = buildMetadata({
    title: "My Reviews | ScholarVista",
    description:
        "Browse the reviews you have submitted on ScholarVista scholarships.",
    path: "/my-reviews",
});

/**
 * Render five stars, the first `rating` filled. Wrapped in an
 * accessible label so screen readers announce "n out of 5 stars".
 */
function StarRating({ rating }: { rating: number }) {
    return (
        <span
            className="inline-flex items-center gap-0.5"
            aria-label={`${rating} out of 5 stars`}
        >
            {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                    key={idx}
                    aria-hidden="true"
                    className={cn(
                        "size-4 transition-colors",
                        idx < rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/40",
                    )}
                />
            ))}
        </span>
    );
}

export default async function MyReviewsPage({
    searchParams,
}: MyReviewsPageProps) {
    let session;
    try {
        session = await requireSession();
    } catch {
        redirect("/sign-in?returnUrl=%2Fmy-reviews");
    }

    const sp = await searchParams;
    const page = parsePage(firstParam(sp.page));

    const reviews = await listReviewsByUser(session.user.id, page, PAGE_SIZE);

    const headingId = "my-reviews-heading";

    return (
        <section
            aria-labelledby={headingId}
            className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1
                        id={headingId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        My Reviews
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Reviews you have submitted on ScholarVista scholarships.
                    </p>
                </div>
                {reviews.total > 0 ? (
                    <Badge variant="secondary">
                        {reviews.total} {reviews.total === 1 ? "review" : "reviews"}
                    </Badge>
                ) : null}
            </header>

            {reviews.items.length === 0 ? (
                <EmptyState
                    icon={MessageSquareText}
                    title="No reviews yet"
                    description="Once you review a scholarship, it will appear here."
                    action={{
                        label: "Browse scholarships",
                        href: "/scholarships",
                    }}
                />
            ) : (
                <ul role="list" className="space-y-4">
                    {reviews.items.map((review) => {
                        const detailHref = `/scholarships/${review.scholarship.id}`;
                        const submittedOn = formatDate(
                            review.createdAt,
                            undefined,
                            {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            },
                        );

                        return (
                            <li key={review.id}>
                                <Card>
                                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
                                        <div className="min-w-0 space-y-1">
                                            <Link
                                                href={detailHref}
                                                className="block truncate text-base font-semibold tracking-tight outline-none transition-colors hover:text-primary focus-visible:text-primary"
                                            >
                                                {review.scholarship.title}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                {review.scholarship.university.name}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-right">
                                            <StarRating rating={review.ratingPoint} />
                                            <time
                                                dateTime={review.createdAt}
                                                className="text-xs text-muted-foreground"
                                            >
                                                {submittedOn}
                                            </time>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                            {review.comment}
                                        </p>
                                    </CardContent>
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}

            {reviews.totalPages > 1 ? (
                <div className="mt-8">
                    <Pagination
                        currentPage={reviews.page}
                        totalPages={reviews.totalPages}
                        baseUrl="/my-reviews"
                    />
                </div>
            ) : null}
        </section>
    );
}
