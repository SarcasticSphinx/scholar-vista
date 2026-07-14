/**
 * My Bookmarks page.
 *
 * Authenticated server component that renders the user's bookmarked
 * scholarships, paginated 12 per page. Reuses `ScholarshipCard` so the
 * visual treatment matches the public catalog, with `isBookmarked={true}`
 * for every card since this page only ever shows bookmarked rows.
 *
 * Data flow:
 *   1. Resolve the current session via `requireSession` (the parent
 *      layout already gates the route, but we read the user id here).
 *   2. Parse the `page` URL param defensively, defaulting to 1.
 *   3. Call `listBookmarksByUser(userId, page, 12)` which clamps the
 *      requested page to the available range.
 *   4. Render the grid + Pagination, or an `EmptyState` linking to the
 *      browse page when the user has no bookmarks yet.
 *
 * Caching:
 *   - Per-user data — never cached. The route runs dynamically and
 *     `actions/bookmark.ts#toggleBookmark` calls
 *     `revalidatePath('/my-bookmarks')` so the list refreshes after a
 *     toggle.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5.
 */

import type { Metadata } from "next";
import { BookmarkIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ScholarshipCard } from "@/components/scholarship/scholarship-card";
import { listBookmarksByUser } from "@/lib/queries/bookmark";
import { requireSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";

/** Per-user data: opt out of any caching so the list reflects live state. */
export const dynamic = "force-dynamic";

/** Fixed page size for the bookmarks list (Req 8.3). */
const PAGE_SIZE = 12;

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "My Bookmarks | ScholarVista",
        description: "Scholarships you've saved for later on ScholarVista.",
        path: "/my-bookmarks",
    });
}

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

interface MyBookmarksPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MyBookmarksPage({
    searchParams,
}: MyBookmarksPageProps) {
    /**
     * Layout already verified the session, but we re-read it here to get
     * the user id without prop-drilling. `requireSession` is request-cached
     * so this is a free lookup after the layout's call.
     */
    const session = await requireSession();
    const params = await searchParams;
    const page = parsePage(firstParam(params.page));

    const result = await listBookmarksByUser(session.user.id, page, PAGE_SIZE);

    const hasResults = result.items.length > 0;
    const headingId = "my-bookmarks-heading";

    return (
        <section
            aria-labelledby={headingId}
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <header className="mb-6 space-y-1">
                <h1
                    id={headingId}
                    className="text-3xl font-semibold tracking-tight"
                >
                    My Bookmarks
                </h1>
                <p className="text-sm text-muted-foreground">
                    Scholarships you&apos;ve saved for later. Tap the bookmark icon
                    on any card to remove it.
                </p>
            </header>

            <p className="sr-only" aria-live="polite">
                {hasResults
                    ? `Showing ${result.items.length} of ${result.total} bookmarks`
                    : "You have no bookmarks yet"}
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
                                isBookmarked
                                priority={idx < 4}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="No bookmarks yet"
                    description="Browse scholarships and tap the bookmark icon to save them here for later."
                    icon={BookmarkIcon}
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
                        baseUrl="/my-bookmarks"
                    />
                </div>
            ) : null}
        </section>
    );
}
