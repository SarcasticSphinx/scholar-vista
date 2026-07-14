"use client";

/**
 * Client sort dropdown for the scholarships browse page.
 *
 * Three options exposed (Req 5.8):
 *   - `createdAt` (default) — newest scholarship first
 *   - `deadline`            — soonest deadline first
 *   - `rating`              — highest average rating first
 *
 * Behaviour mirrors `FilterBar`:
 *   - The current sort key is read from the URL `?sort=` parameter.
 *   - Selecting a value rewrites `?sort=...` and clears `?page=` so the
 *     listing restarts at page 1, while every other URL parameter is
 *     preserved (Req 5.7).
 *
 * Validates: Requirement 5.8.
 */

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sort tokens accepted by `ScholarshipFiltersSchema.sort`. */
export type ScholarshipSortValue = "createdAt" | "deadline" | "rating";

const SORT_OPTIONS: Array<{ value: ScholarshipSortValue; label: string }> = [
    { value: "createdAt", label: "Newest first" },
    { value: "deadline", label: "Deadline (soonest)" },
    { value: "rating", label: "Highest rated" },
];

const DEFAULT_SORT: ScholarshipSortValue = "createdAt";

export interface SortSelectProps {
    /** Optional className applied to the trigger button. */
    className?: string;
}

/**
 * Render the sort dropdown wired to the URL. Always renders a defined
 * value because the underlying `Select` is controlled — when the URL has
 * no `sort` param we fall back to the default `createdAt`.
 */
export function SortSelect({ className }: SortSelectProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const current = (searchParams?.get("sort") as ScholarshipSortValue | null) ?? DEFAULT_SORT;
    const value: ScholarshipSortValue = SORT_OPTIONS.some((o) => o.value === current)
        ? current
        : DEFAULT_SORT;

    const onValueChange = React.useCallback(
        (next: string) => {
            const nextValue = next as ScholarshipSortValue;
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            if (nextValue === DEFAULT_SORT) {
                params.delete("sort");
            } else {
                params.set("sort", nextValue);
            }
            // Reset pagination when sort changes — the slice has shifted.
            params.delete("page");
            const target = pathname ?? "/scholarships";
            const query = params.toString();
            router.replace(query ? `${target}?${query}` : target, {
                scroll: false,
            });
        },
        [pathname, router, searchParams],
    );

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <label
                htmlFor="scholarship-sort"
                className="text-xs font-medium text-muted-foreground"
            >
                Sort by
            </label>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger
                    id="scholarship-sort"
                    className="w-full sm:w-[14rem]"
                    aria-label="Sort scholarships"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
