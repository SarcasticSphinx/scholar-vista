/**
 * Scholarship detail page.
 *
 * Server-rendered page that displays the full scholarship profile, the
 * scholarship's reviews (≤10/page), up to six related scholarships, and
 * an auth-aware "Apply Now" + bookmark control bar.
 *
 * URL contract:
 *   - dynamic segment `[id]` — scholarship primary key.
 *   - `?reviewsPage=` — pagination cursor for the reviews list.
 *
 * Visibility:
 *   - Unapproved (`isApproved=false`) scholarships are hidden from public
 *     viewers and return `notFound()` (Req 6.9).
 *   - Owners and admins/moderators may still preview their unapproved
 *     submissions through `getScholarshipForOwner`.
 *
 * SEO:
 *   - `generateMetadata` returns title/description/OG/canonical metadata
 *     built around the scholarship title (Req 6.1, 24.1, 24.6).
 *   - A Schema.org `Scholarship` JSON-LD payload is emitted via
 *     `<script type="application/ld+json">` (Req 24.5).
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 24.5.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    AlertTriangle,
    BookmarkCheck,
    CalendarDays,
    Clock,
    DollarSign,
    ExternalLink,
    GraduationCap,
    LogIn,
    MapPin,
    MessageSquareText,
    School,
    Star,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { BookmarkButton } from "@/components/scholarship/bookmark-button";
import { ScholarshipCard } from "@/components/scholarship/scholarship-card";
import { ReviewForm } from "@/components/forms/review-form";
import {
    getScholarshipById,
    getScholarshipForOwner,
    relatedScholarships,
} from "@/lib/queries/scholarship";
import { hasUserReviewed, listReviewsByScholarship } from "@/lib/queries/review";
import { isBookmarked as isBookmarkedQuery } from "@/lib/queries/bookmark";
import { getOptionalSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";
import { scholarshipJsonLd } from "@/lib/jsonld";
import { formatCurrency, formatDate } from "@/lib/intl";

/** Detail pages opt into ISR (per design.md §"Caching strategy"). */
export const revalidate = 60;

const REVIEWS_PAGE_SIZE = 10;
const RELATED_LIMIT = 6;

interface ScholarshipDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Coerce `searchParams[key]` into a single string (drops arrays/undefined). */
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

/** Convert the database enum to a human-friendly label without `_`. */
function categoryLabel(category: string): string {
    return category
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse `Decimal -> string` to a finite number for currency formatting. */
function toNumber(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Whether the scholarship deadline has passed.
 *
 * Reads the system clock — kept outside the component body so the React
 * compiler's purity rule doesn't flag the render path. Server components
 * already evaluate this once per request, so the result is stable for the
 * duration of a single render.
 */
function isDeadlinePassed(deadline: Date): boolean {
    if (!Number.isFinite(deadline.getTime())) return false;
    return deadline.getTime() < Date.now();
}

/**
 * Resolve the scholarship a viewer is allowed to see.
 *
 * Public viewers only see approved records (Req 6.9). Owners and
 * admins/moderators may also see their pending submission through the
 * dedicated `getScholarshipForOwner` query. Returns `null` if the
 * scholarship doesn't exist or the viewer lacks permission to see it.
 */
async function resolveScholarship(
    id: string,
    viewer: { userId: string | null; role: string | null },
) {
    const publicView = await getScholarshipById(id);
    if (publicView) return publicView;

    const isPrivileged =
        viewer.role === "ADMIN" || viewer.role === "MODERATOR";
    if (viewer.userId === null && !isPrivileged) return null;

    return getScholarshipForOwner(id, viewer.userId ?? "", isPrivileged);
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const scholarship = await getScholarshipById(id);

    if (!scholarship) {
        return buildMetadata({
            title: "Scholarship not found | ScholarVista",
            description: "The requested scholarship could not be found.",
            path: `/scholarships/${id}`,
        });
    }

    return buildMetadata({
        title: `${scholarship.title} | ScholarVista`,
        description:
            scholarship.description ||
            `Apply for ${scholarship.title} offered by ${scholarship.university.name}.`,
        path: `/scholarships/${scholarship.id}`,
        image: scholarship.image ?? scholarship.university.logo ?? undefined,
    });
}

export default async function ScholarshipDetailPage({
    params,
    searchParams,
}: ScholarshipDetailPageProps) {
    const [{ id }, sp] = await Promise.all([params, searchParams]);

    const session = await getOptionalSession();
    const viewerUserId = session?.user?.id ?? null;
    const viewerRole =
        (session?.user as { role?: string } | undefined)?.role ?? null;

    const scholarship = await resolveScholarship(id, {
        userId: viewerUserId,
        role: viewerRole,
    });
    if (!scholarship) notFound();

    const reviewsPage = parsePage(firstParam(sp.reviewsPage));

    const [reviews, related, bookmarked, alreadyReviewed] = await Promise.all([
        listReviewsByScholarship(scholarship.id, reviewsPage, REVIEWS_PAGE_SIZE),
        relatedScholarships(scholarship.id, RELATED_LIMIT),
        viewerUserId
            ? isBookmarkedQuery(viewerUserId, scholarship.id)
            : Promise.resolve(false),
        viewerUserId
            ? hasUserReviewed(viewerUserId, scholarship.id)
            : Promise.resolve(false),
    ]);

    const deadlineDate = new Date(scholarship.deadline);
    const isExpired = isDeadlinePassed(deadlineDate);

    const stipendNumber = toNumber(scholarship.stipend);
    const feesNumber = toNumber(scholarship.fees);
    const formattedDeadline = formatDate(deadlineDate, undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const formattedStipend =
        stipendNumber > 0 ? formatCurrency(stipendNumber) : "Amount varies";
    const formattedFees =
        feesNumber > 0 ? formatCurrency(feesNumber) : "Free to apply";

    const headingId = `scholarship-${scholarship.id}-heading`;
    const reviewsHeadingId = `scholarship-${scholarship.id}-reviews`;
    const relatedHeadingId = `scholarship-${scholarship.id}-related`;

    const applyTarget = `/scholarships/${scholarship.id}/apply`;
    const applyHref = viewerUserId
        ? applyTarget
        : `/sign-in?returnUrl=${encodeURIComponent(applyTarget)}`;
    const applyDisabled = isExpired;

    const jsonLd = scholarshipJsonLd({
        id: scholarship.id,
        title: scholarship.title,
        description: scholarship.description,
        university: {
            name: scholarship.university.name,
            url: scholarship.university.website,
            country: scholarship.university.country,
            city: scholarship.university.city,
        },
        applicationDeadline: scholarship.deadline,
        stipend: stipendNumber,
    });

    return (
        <article
            aria-labelledby={headingId}
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            {/* Schema.org JSON-LD for Req 24.5. */}
            <script
                type="application/ld+json"
                // Prisma values are already serializable; JSON.stringify is safe here.
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Owner / admin preview banner for unapproved scholarships. */}
            {!scholarship.isApproved ? (
                <div
                    role="status"
                    className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200"
                >
                    This scholarship is awaiting approval and is not yet visible to
                    the public.
                </div>
            ) : null}

            {/* Expired-deadline banner for Req 6.8. */}
            {isExpired ? (
                <div
                    role="alert"
                    className="mb-6 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive dark:bg-destructive/10"
                >
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">Application deadline has passed.</p>
                        <p className="text-destructive/90">
                            This scholarship is no longer accepting new applications.
                        </p>
                    </div>
                </div>
            ) : null}

            {/* ---------------------------------------------------------------
            Hero block — title, university link, badges, action bar
            --------------------------------------------------------------- */}
            <header className="mb-8 grid gap-6 rounded-xl border bg-card p-6 shadow-sm md:grid-cols-[auto_1fr]">
                <div className="flex items-start gap-4 md:items-center">
                    {scholarship.university.logo ? (
                        <Image
                            src={scholarship.university.logo}
                            alt={`${scholarship.university.name} logo`}
                            width={96}
                            height={96}
                            priority
                            sizes="96px"
                            className="size-20 shrink-0 rounded-lg bg-background object-contain ring-1 ring-border md:size-24"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl font-semibold uppercase text-muted-foreground ring-1 ring-border md:size-24"
                        >
                            {scholarship.university.name.charAt(0)}
                        </span>
                    )}
                </div>

                <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                            {categoryLabel(scholarship.category)}
                        </Badge>
                        {isExpired ? (
                            <Badge variant="destructive" className="gap-1">
                                <Clock aria-hidden="true" className="size-3" />
                                Expired
                            </Badge>
                        ) : null}
                        {scholarship.averageRating !== null ? (
                            <span
                                className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                                aria-label={`Average rating ${scholarship.averageRating.toFixed(
                                    1,
                                )} out of 5`}
                            >
                                <Star
                                    aria-hidden="true"
                                    className="size-4 fill-yellow-400 text-yellow-400"
                                />
                                <span className="font-medium text-foreground">
                                    {scholarship.averageRating.toFixed(1)}
                                </span>
                                <span>
                                    ({scholarship.reviewCount}{" "}
                                    {scholarship.reviewCount === 1 ? "review" : "reviews"})
                                </span>
                            </span>
                        ) : null}
                    </div>

                    <h1
                        id={headingId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        {scholarship.title}
                    </h1>

                    <Link
                        href={`/universities/${scholarship.university.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                        <School aria-hidden="true" className="size-4" />
                        {scholarship.university.name}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin aria-hidden="true" className="size-4" />
                            {scholarship.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays aria-hidden="true" className="size-4" />
                            <time dateTime={scholarship.deadline}>
                                {formattedDeadline}
                            </time>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <DollarSign aria-hidden="true" className="size-4" />
                            {formattedStipend}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        {applyDisabled ? (
                            <Button
                                type="button"
                                size="lg"
                                disabled
                                aria-disabled="true"
                                title="Applications are closed for this scholarship"
                            >
                                <Clock aria-hidden="true" className="size-4" />
                                Applications closed
                            </Button>
                        ) : (
                            <Button asChild size="lg">
                                <Link href={applyHref}>
                                    {viewerUserId ? (
                                        <GraduationCap aria-hidden="true" className="size-4" />
                                    ) : (
                                        <LogIn aria-hidden="true" className="size-4" />
                                    )}
                                    {viewerUserId ? "Apply Now" : "Sign in to apply"}
                                </Link>
                            </Button>
                        )}

                        {viewerUserId ? (
                            <BookmarkButton
                                scholarshipId={scholarship.id}
                                initial={bookmarked}
                            />
                        ) : null}

                        {scholarship.applicationLink ? (
                            <Button asChild variant="outline" size="lg">
                                <a
                                    href={scholarship.applicationLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Open external application link in a new tab"
                                >
                                    <ExternalLink aria-hidden="true" className="size-4" />
                                    External application link
                                </a>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </header>

            {/* ---------------------------------------------------------------
            Description / requirements / coverage / factsheet
            --------------------------------------------------------------- */}
            <section
                aria-label="Scholarship details"
                className="grid gap-6 lg:grid-cols-3"
            >
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <h2 className="text-xl font-semibold tracking-tight">
                                About this scholarship
                            </h2>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                {scholarship.description}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h2 className="text-xl font-semibold tracking-tight">
                                Requirements
                            </h2>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                {scholarship.requirements}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h2 className="text-xl font-semibold tracking-tight">
                                Coverage
                            </h2>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                {scholarship.coverage}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Factsheet
                        </h2>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Subject
                                </dt>
                                <dd className="font-medium">{scholarship.subject}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Category
                                </dt>
                                <dd className="font-medium">
                                    {categoryLabel(scholarship.category)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Stipend
                                </dt>
                                <dd className="font-medium">{formattedStipend}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Application fees
                                </dt>
                                <dd className="font-medium">{formattedFees}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Deadline
                                </dt>
                                <dd className="font-medium">
                                    <time dateTime={scholarship.deadline}>
                                        {formattedDeadline}
                                    </time>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Location
                                </dt>
                                <dd className="font-medium">{scholarship.location}</dd>
                            </div>
                            {scholarship.applicationLink ? (
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Application link
                                    </dt>
                                    <dd className="break-words font-medium">
                                        <a
                                            href={scholarship.applicationLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline-offset-4 hover:underline"
                                        >
                                            {scholarship.applicationLink}
                                        </a>
                                    </dd>
                                </div>
                            ) : null}
                        </dl>
                    </CardContent>
                </Card>
            </section>

            {/* ---------------------------------------------------------------
            Reviews
            --------------------------------------------------------------- */}
            <section aria-labelledby={reviewsHeadingId} className="mt-12">
                <header className="mb-4 flex items-center justify-between gap-3">
                    <h2
                        id={reviewsHeadingId}
                        className="text-2xl font-semibold tracking-tight"
                    >
                        Reviews
                    </h2>
                    {scholarship.reviewCount > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {scholarship.averageRating !== null
                                ? `${scholarship.averageRating.toFixed(1)} average · `
                                : null}
                            {scholarship.reviewCount}{" "}
                            {scholarship.reviewCount === 1 ? "review" : "reviews"}
                        </p>
                    ) : null}
                </header>

                {/* Auth-aware review composer (Req 10.1, 10.3, 10.6). */}
                {viewerUserId ? (
                    alreadyReviewed ? (
                        <p
                            role="status"
                            className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
                        >
                            You&apos;ve reviewed this scholarship.
                        </p>
                    ) : (
                        <div className="mb-6">
                            <ReviewForm scholarshipId={scholarship.id} />
                        </div>
                    )
                ) : null}

                {reviews.items.length > 0 ? (
                    <ul role="list" className="space-y-4">
                        {reviews.items.map((review) => (
                            <li key={review.id}>
                                <Card>
                                    <CardContent className="flex gap-4 p-4">
                                        <Avatar className="size-10 shrink-0">
                                            {review.user.profilePicture ||
                                                review.user.image ? (
                                                <AvatarImage
                                                    src={
                                                        review.user.profilePicture ??
                                                        review.user.image ??
                                                        ""
                                                    }
                                                    alt={`${review.user.name} avatar`}
                                                />
                                            ) : null}
                                            <AvatarFallback>
                                                {review.user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium text-foreground">
                                                    {review.user.name}
                                                </span>
                                                <span
                                                    className="inline-flex items-center gap-0.5 text-sm text-muted-foreground"
                                                    aria-label={`${review.ratingPoint} out of 5 stars`}
                                                >
                                                    {Array.from({ length: 5 }).map(
                                                        (_, idx) => (
                                                            <Star
                                                                key={idx}
                                                                aria-hidden="true"
                                                                className={
                                                                    idx < review.ratingPoint
                                                                        ? "size-3.5 fill-yellow-400 text-yellow-400"
                                                                        : "size-3.5 text-muted-foreground/40"
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </span>
                                                <time
                                                    dateTime={review.createdAt}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    {formatDate(review.createdAt, undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </time>
                                            </div>
                                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                                {review.comment}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        title="No reviews yet"
                        description="Be the first to share your experience with this scholarship."
                        icon={MessageSquareText}
                    />
                )}

                {reviews.totalPages > 1 ? (
                    <div className="mt-6">
                        <Pagination
                            currentPage={reviews.page}
                            totalPages={reviews.totalPages}
                            baseUrl={`/scholarships/${scholarship.id}`}
                        />
                    </div>
                ) : null}
            </section>

            {/* ---------------------------------------------------------------
            Related scholarships
            --------------------------------------------------------------- */}
            {related.length > 0 ? (
                <>
                    <Separator className="my-12" />
                    <section aria-labelledby={relatedHeadingId}>
                        <header className="mb-4">
                            <h2
                                id={relatedHeadingId}
                                className="text-2xl font-semibold tracking-tight"
                            >
                                <BookmarkCheck
                                    aria-hidden="true"
                                    className="mr-2 inline size-5 align-text-bottom text-primary"
                                />
                                Related scholarships
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Other opportunities in the same category or from the same
                                university.
                            </p>
                        </header>
                        <ul
                            role="list"
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {related.map((item) => (
                                <li key={item.id} className="h-full">
                                    <ScholarshipCard scholarship={item} />
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            ) : null}
        </article>
    );
}
