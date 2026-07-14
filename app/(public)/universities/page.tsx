/**
 * Public universities listing page.
 *
 * Server component that renders the paginated catalog of universities,
 * optionally filtered by a case-insensitive search applied to `name` or
 * `country` (Req 13.1, 13.2, 13.4, 13.5, 13.6). Pagination is fixed at
 * 12 cards per page (Req 13.1).
 *
 * URL contract:
 *   - `q`    — search string (case-insensitive partial match).
 *   - `page` — 1-indexed page number, clamped server-side.
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6.
 */

import type { Metadata } from "next";
import { Building2, SearchX } from "lucide-react";

import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { UniversityCard } from "@/components/university/university-card";
import { UniversitySearch } from "@/components/university/university-search";
import { listUniversities } from "@/lib/queries/university";
import { buildMetadata } from "@/lib/seo";

/** Universities listing is server-rendered with a 5-minute Data Cache window. */
export const revalidate = 300;

const PAGE_SIZE = 12;

/**
 * Coerce a `searchParams` entry into a single string, dropping arrays and
 * `undefined` values so we always pass a stable string into queries.
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

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "Universities | ScholarVista",
        description:
            "Browse universities offering scholarships on ScholarVista. Search by name or country to find your next institution.",
        path: "/universities",
    });
}

interface UniversitiesPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UniversitiesPage({
    searchParams,
}: UniversitiesPageProps) {
    const params = await searchParams;
    const query = firstParam(params.q).trim();
    const page = parsePage(firstParam(params.page));

    const result = await listUniversities({
        search: query || undefined,
        page,
        pageSize: PAGE_SIZE,
    });

    const hasResults = result.items.length > 0;
    const headingId = "universities-heading";

    return (
        <section
            aria-labelledby={headingId}
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1
                        id={headingId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        Universities
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Discover institutions partnered with ScholarVista and the
                        scholarships they offer.
                    </p>
                </div>
                <UniversitySearch
                    initialQuery={query}
                    className="w-full sm:max-w-sm"
                />
            </header>

            <p className="sr-only" aria-live="polite">
                {hasResults
                    ? `Showing ${result.items.length} of ${result.total} universities`
                    : "No universities match your search"}
            </p>

            {hasResults ? (
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {result.items.map((university, idx) => (
                        <li key={university.id} className="h-full">
                            <UniversityCard
                                university={university}
                                priority={idx < 4}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="No universities found"
                    description={
                        query
                            ? `We couldn't find any universities matching "${query}". Try a different name or country.`
                            : "Universities will appear here once they're added."
                    }
                    icon={query ? SearchX : Building2}
                    action={
                        query
                            ? { label: "Clear search", href: "/universities" }
                            : undefined
                    }
                />
            )}

            {hasResults && result.totalPages > 1 ? (
                <div className="mt-10">
                    <Pagination
                        currentPage={result.page}
                        totalPages={result.totalPages}
                        baseUrl="/universities"
                    />
                </div>
            ) : null}
        </section>
    );
}
