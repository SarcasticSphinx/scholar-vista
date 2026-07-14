/**
 * Loading shell for the scholarship detail page.
 *
 * Streams a skeleton mirroring the loaded layout (hero block, factsheet,
 * reviews list, related grid) so the page is visually stable while the
 * server query resolves.
 *
 * Validates: Requirement 25.2 (skeletons match component dimensions).
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScholarshipCardSkeleton } from "@/components/shared/skeletons";

const REVIEWS_PAGE_SIZE = 10;
const RELATED_LIMIT = 6;

export default function ScholarshipDetailLoading() {
    return (
        <article
            aria-busy="true"
            aria-label="Loading scholarship details"
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            {/* Hero */}
            <header className="mb-8 grid gap-6 rounded-xl border bg-card p-6 shadow-sm md:grid-cols-[auto_1fr]">
                <Skeleton className="size-20 shrink-0 rounded-lg md:size-24" />
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-9 w-3/4" />
                    <Skeleton className="h-4 w-48" />
                    <div className="flex flex-wrap gap-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="size-10" />
                        <Skeleton className="h-10 w-44" />
                    </div>
                </div>
            </header>

            {/* Description + Factsheet */}
            <section className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <Card key={idx}>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 7 }).map((_, idx) => (
                            <div key={idx} className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            {/* Reviews */}
            <section className="mt-12">
                <div className="mb-4 flex items-center justify-between">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <ul role="list" className="space-y-4">
                    {Array.from({ length: REVIEWS_PAGE_SIZE / 2 }).map((_, idx) => (
                        <li key={idx}>
                            <Card>
                                <CardContent className="flex gap-4 p-4">
                                    <Skeleton className="size-10 shrink-0 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                    </div>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Related */}
            <section className="mt-12">
                <Skeleton className="mb-4 h-7 w-56" />
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {Array.from({ length: RELATED_LIMIT }).map((_, idx) => (
                        <li key={idx}>
                            <ScholarshipCardSkeleton />
                        </li>
                    ))}
                </ul>
            </section>
        </article>
    );
}
