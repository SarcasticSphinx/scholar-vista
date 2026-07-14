/**
 * Loading shell for the university detail page.
 *
 * Streams a skeleton mirroring the loaded layout (hero block, factsheet,
 * scholarships grid) so the page is visually stable while server data
 * resolves.
 *
 * Validates: Requirement 25.2 (skeletons match component dimensions).
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScholarshipCardSkeleton } from "@/components/shared/skeletons";

const SCHOLARSHIPS_PAGE_SIZE = 10;

export default function UniversityDetailLoading() {
    return (
        <article
            aria-busy="true"
            aria-label="Loading university details"
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            {/* Hero */}
            <header className="mb-8 flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:flex-row md:items-center">
                <Skeleton className="size-24 shrink-0 rounded-lg md:size-32" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex flex-wrap items-center gap-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-5 w-32 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                </div>
                <Skeleton className="h-9 w-36 self-start" />
            </header>

            {/* About + Factsheet */}
            <section className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
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
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            {/* Scholarships grid */}
            <section className="mt-12">
                <div className="mb-4 flex items-center justify-between">
                    <Skeleton className="h-7 w-72" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {Array.from({ length: SCHOLARSHIPS_PAGE_SIZE }).map(
                        (_, idx) => (
                            <li key={idx}>
                                <ScholarshipCardSkeleton />
                            </li>
                        ),
                    )}
                </ul>
            </section>
        </article>
    );
}
