/**
 * Shared skeleton placeholders that match the dimensions of their loaded
 * counterparts so route-level `loading.tsx` files can stream a stable
 * shell.
 *
 * Each export mirrors the shape of a real component:
 *   - `ScholarshipCardSkeleton` ↔ `ScholarshipCard`
 *   - `UniversityCardSkeleton`  ↔ `UniversityCard` (task 8.10)
 *   - `StatsSkeleton`           ↔ home-page platform stats
 *   - `TableRowSkeleton`        ↔ admin DataTable row
 *
 * These are pure server components — no JS shipped.
 *
 * Validates: Requirements 4.6, 5.9, 25.2 (skeleton placeholders).
 */

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Card placeholder used by scholarship listings while data is loading. */
export function ScholarshipCardSkeleton({
    className,
}: {
    className?: string;
}) {
    return (
        <Card
            aria-hidden="true"
            data-slot="scholarship-card-skeleton"
            className={cn("flex h-full flex-col overflow-hidden", className)}
        >
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <div className="flex items-center gap-1">
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="size-8 rounded-md" />
                </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-sm" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t p-4 pt-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
            </CardFooter>
        </Card>
    );
}

/** Card placeholder used by the universities listing and partner rail. */
export function UniversityCardSkeleton({
    className,
}: {
    className?: string;
}) {
    return (
        <Card
            aria-hidden="true"
            data-slot="university-card-skeleton"
            className={cn("flex h-full flex-col overflow-hidden", className)}
        >
            <CardHeader className="flex flex-row items-center gap-3 p-4">
                <Skeleton className="size-12 rounded-md" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
            </CardContent>
            <CardFooter className="border-t p-4 pt-3">
                <Skeleton className="h-3 w-24" />
            </CardFooter>
        </Card>
    );
}

/**
 * Skeleton row used by the home-page stats band and dashboard summary
 * tiles. Renders three placeholder tiles by default.
 */
export function StatsSkeleton({
    count = 3,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div
            aria-hidden="true"
            data-slot="stats-skeleton"
            className={cn(
                "grid gap-4 sm:grid-cols-2 md:grid-cols-3",
                className,
            )}
        >
            {Array.from({ length: count }).map((_, idx) => (
                <Card key={idx} className="overflow-hidden">
                    <CardHeader className="space-y-2 p-4 pb-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-7 w-32" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <Skeleton className="h-3 w-3/4" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/**
 * Single placeholder row for shadcn `Table`-based admin lists. Number of
 * cells matches the `columns` prop so it can be reused across DataTables
 * without per-page tweaks.
 */
export function TableRowSkeleton({
    columns = 4,
    className,
}: {
    columns?: number;
    className?: string;
}) {
    return (
        <TableRow
            aria-hidden="true"
            data-slot="table-row-skeleton"
            className={className}
        >
            {Array.from({ length: columns }).map((_, idx) => (
                <TableCell key={idx} className="py-3">
                    <Skeleton className="h-4 w-full" />
                </TableCell>
            ))}
        </TableRow>
    );
}
