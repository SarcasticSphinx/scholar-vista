/**
 * Public scholarships browse page.
 *
 * Server component that paginates the approved-scholarship catalog through
 * `listScholarships`, shows 12 cards per page, and forwards URL search
 * params to the query layer (Req 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8,
 * 5.9, 5.10, 5.11).
 *
 * URL contract (parsed by `ScholarshipFiltersSchema`):
 *   - `q`        — case-insensitive search ≥ 2 chars over title/university/subject.
 *   - `category` — `UNDERGRADUATE | MASTERS | PHD | POSTDOC | EXCHANGE | SHORT_COURSE`.
 *   - `country`  — exact match (case-insensitive) against University.country.
 *   - `funding`  — substring match against scholarship coverage/description.
 *   - `deadline` — `7 | 30 | 90` (days from now).
 *   - `sort`     — `createdAt` (default) | `deadline` | `rating`.
 *   - `page`     — 1-indexed page number, clamped server-side.
 *
 * Data flow:
 *   1. Parse `searchParams` via `ScholarshipFiltersSchema` so the page
 *      tolerates malformed URLs (Req 5.7).
 *   2. Call `listScholarships(...)` with the parsed filters/sort/page.
 *   3. Resolve the per-card bookmark state in one batched query via
 *      `getUserBookmarkSet` when the user is signed in.
 *   4. Render the grid + Pagination, or an `EmptyState` when no rows match.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11.
 */

import type { Metadata } from "next";
import { GraduationCap, SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { FilterBar } from "@/components/scholarship/filter-bar";
import { ScholarshipCard } from "@/components/scholarship/scholarship-card";
import { SortSelect } from "@/components/scholarship/sort-select";
import { SearchAutocomplete } from "@/components/scholarship/search-autocomplete";
import { getUserBookmarkSet } from "@/lib/queries/bookmark";
import { listScholarships } from "@/lib/queries/scholarship";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";
import { buildMetadata } from "@/lib/seo";
import { ScholarshipFiltersSchema } from "@/lib/validation/scholarship";

/** Fixed page size for the public catalog (Req 5.1). */
const PAGE_SIZE = 12;

/** Public catalog hits the Data Cache; matches `REVALIDATE.scholarshipList`. */
export const revalidate = 60;

/**
 * Static metadata for the listing page. The detail page handles its own
 * dynamic metadata via `generateMetadata`.
 */
export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "Scholarships | ScholarVista",
        description:
            "Browse approved scholarships on ScholarVista. Filter by category, country, funding, and deadline to find your match.",
        path: "/scholarships",
    });
}

/**
 * Coerce a `searchParams` entry into a single string so Zod has a stable
 * primitive input. Arrays (duplicate keys) collapse to their first value.
 */
function firstParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

/**
 * Reduce the raw `Record<string, string|string[]|undefined>` we get from
 * Next.js into a flat object suitable for `ScholarshipFiltersSchema`.
 * Empty strings are dropped so they don't trip the schema's min-length
 * checks on `q`.
 */
function normalizeSearchParams(
    raw: Record<string, string | string[] | undefined>,
): Record<string, string> {
    const result: Record<string, string> = {};
    const keys = ["q", "category", "country", "funding", "deadline", "sort", "page"] as const;
    for (const key of keys) {
        const value = firstParam(raw[key]);
        if (value !== undefined && value.length > 0) {
            result[key] = value;
        }
    }
    return result;
}

interface ScholarshipsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ScholarshipsPage({
    searchParams,
}: ScholarshipsPageProps) {
    const raw = await searchParams;
    const normalized = normalizeSearchParams(raw);

    /**
     * Parse leniently — invalid filter values fall back to defaults rather
     * than 4xx-ing. This keeps shareable URLs robust as we evolve the
     * filter set (Req 5.7).
     */
    const parsed = ScholarshipFiltersSchema.safeParse(normalized);
    const filters = parsed.success
        ? parsed.data
        : ScholarshipFiltersSchema.parse({});

    /** `q` from validated filters is already trimmed and ≥ 2 chars; pass as-is. */
    const queryString = filters.q ?? "";

    /** Translate the schema's deadline string ("7"|"30"|"90") into a number. */
    const deadlineDays =
        filters.deadline === "7"
            ? 7
            : filters.deadline === "30"
                ? 30
                : filters.deadline === "90"
                    ? 90
                    : undefined;

    /**
     * Fetch listing + distinct country list + session in parallel. Country
     * options come from `University.country` so the dropdown only shows
     * values that actually have a record behind them.
     */
    const [result, countryRows, session] = await Promise.all([
        listScholarships({
            filters: {
                q: filters.q,
                category: filters.category,
                country: filters.country,
                funding: filters.funding,
                deadline: deadlineDays,
            },
            sort: filters.sort,
            page: filters.page,
            pageSize: PAGE_SIZE,
        }),
        prisma.university.findMany({
            select: { country: true },
            distinct: ["country"],
            orderBy: { country: "asc" },
        }),
        getServerSession(),
    ]);

    /**
     * Resolve bookmark state for the visible page in a single query when
     * the user is signed in. Anonymous visitors get an empty set so cards
     * render the unbookmarked icon.
     */
    const bookmarkedIds = session?.user?.id
        ? await getUserBookmarkSet(
            session.user.id,
            result.items.map((row) => row.id),
        )
        : new Set<string>();

    const countries = countryRows
        .map((row) => row.country)
        .filter((c): c is string => Boolean(c && c.trim().length > 0));

    const hasResults = result.items.length > 0;
    const hasActiveFilters = Boolean(
        filters.q ||
        filters.category ||
        filters.country ||
        filters.funding ||
        filters.deadline,
    );

    const headingId = "scholarships-heading";

    return (
        <section
            aria-labelledby={headingId}
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <header className="mb-6 flex flex-col gap-4">
                <div className="space-y-1">
                    <h1
                        id={headingId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        Scholarships
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Filter by category, country, funding type, and deadline to
                        narrow the catalog.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <SearchAutocomplete
                        initialQuery={queryString}
                        action="/scholarships"
                        filterInPlace
                        placeholder="Search scholarships or universities…"
                        className="sm:max-w-md"
                    />
                    <SortSelect />
                </div>

                <FilterBar countries={countries} />
            </header>

            <p className="sr-only" aria-live="polite">
                {hasResults
                    ? `Showing ${result.items.length} of ${result.total} scholarships`
                    : "No scholarships match your filters"}
            </p>

            {hasResults ? (
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {result.items.map((scholarship, idx) => (
                        <li key={scholarship.id} className="h-full">
                            <ScholarshipCard
                                scholarship={scholarship}
                                isBookmarked={bookmarkedIds.has(scholarship.id)}
                                priority={idx < 4}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="No scholarships found"
                    description={
                        hasActiveFilters
                            ? "We couldn't find any scholarships matching the current filters. Try adjusting or clearing them."
                            : "Approved scholarships will appear here as they're added."
                    }
                    icon={hasActiveFilters ? SearchX : GraduationCap}
                    action={
                        hasActiveFilters
                            ? { label: "Clear filters", href: "/scholarships" }
                            : undefined
                    }
                />
            )}

            {hasResults && result.totalPages > 1 ? (
                <div className="mt-10">
                    <Pagination
                        currentPage={result.page}
                        totalPages={result.totalPages}
                        baseUrl="/scholarships"
                    />
                </div>
            ) : null}
        </section>
    );
}
