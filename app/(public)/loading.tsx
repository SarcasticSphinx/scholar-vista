/**
 * Loading shell for the public home page (`/`).
 *
 * Streams a skeleton layout that mirrors the four sections of the real
 * page (hero, featured scholarships, platform stats, partner
 * universities) so users see a stable shape while the server resolves
 * the parallel queries (Req 4.6).
 *
 * Validates: Requirement 4.6 (loading skeletons match the home layout).
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ScholarshipCardSkeleton,
    UniversityCardSkeleton,
} from "@/components/shared/skeletons";

export default function HomeLoading() {
    return (
        <div aria-busy="true" aria-label="Loading home page">
            {/* Hero shell */}
            <section className="border-b bg-secondary/40">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8 lg:py-24">
                    <div className="flex flex-col gap-6">
                        <Skeleton className="h-6 w-44 rounded-full" />
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-3/4" />
                            <Skeleton className="h-10 w-2/3" />
                        </div>
                        <Skeleton className="h-5 w-full max-w-xl" />
                        <Skeleton className="h-5 w-5/6 max-w-xl" />
                        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                            <Skeleton className="h-11 flex-1" />
                            <Skeleton className="h-11 w-full sm:w-28" />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Skeleton className="h-10 w-52" />
                            <Skeleton className="h-10 w-36" />
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
                    </div>
                </div>
            </section>

            {/* Featured scholarships shell */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-4 w-80 max-w-full" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <li key={idx}>
                            <ScholarshipCardSkeleton />
                        </li>
                    ))}
                </ul>
            </section>

            {/* Stats shell */}
            <section className="border-y bg-muted/30">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mb-8 max-w-2xl space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-9 w-72" />
                        <Skeleton className="h-4 w-96 max-w-full" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <Card key={idx}>
                                <CardContent className="flex flex-col gap-3 p-6">
                                    <Skeleton className="size-10 rounded-lg" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-9 w-24" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Partner universities shell */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-4 w-80 max-w-full" />
                    </div>
                    <Skeleton className="h-8 w-32" />
                </div>
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <li key={idx}>
                            <UniversityCardSkeleton />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
