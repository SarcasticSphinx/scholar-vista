/**
 * Loading shell for the universities listing.
 *
 * Streams a skeleton grid that matches the `UniversityCard` dimensions so
 * users see a stable layout while the server completes the listing query.
 *
 * Validates: Requirement 25.2 (skeletons match component dimensions).
 */

import { Skeleton } from "@/components/ui/skeleton";
import { UniversityCardSkeleton } from "@/components/shared/skeletons";

const PAGE_SIZE = 12;

export default function UniversitiesLoading() {
    return (
        <section
            aria-busy="true"
            aria-label="Loading universities"
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-9 w-full sm:max-w-sm" />
            </div>

            <ul
                role="list"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
                {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                    <li key={idx}>
                        <UniversityCardSkeleton />
                    </li>
                ))}
            </ul>
        </section>
    );
}
