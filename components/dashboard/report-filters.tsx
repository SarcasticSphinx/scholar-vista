"use client";

/**
 * Reports page filter controls (client island).
 *
 * Renders a date-range picker (two native `<input type="date">` controls)
 * and a granularity `<select>` that drive the admin Reports page. Each
 * change rewrites the URL `?start`, `?end`, `?granularity` params via
 * `router.replace(...)` so the server component re-queries and the view is
 * shareable / bookmarkable.
 *
 * Client-side guardrails mirror the server contract in `lib/reports.ts`:
 *   - `end` cannot precede `start` (and vice-versa) — the conflicting bound
 *     is nudged to keep the window valid.
 *   - the window is capped at 365 days (Requirement 31.1); selecting a wider
 *     range pulls the opposite bound in.
 * The server still re-validates via `parseReportParams`, so these are UX
 * affordances rather than the source of truth.
 *
 * Validates: Requirement 31.1 (date-range filter, 365-day max),
 * Requirement 31.2 (granularity selection: daily/weekly/monthly).
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
import { Label } from "@/components/ui/label";
import { GRANULARITIES, MAX_RANGE_DAYS, type Granularity } from "@/lib/reports";
import { cn } from "@/lib/utils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const GRANULARITY_LABELS: Record<Granularity, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
};

export interface ReportFiltersProps {
    /** Current start day as `YYYY-MM-DD` (UTC). */
    start: string;
    /** Current end day as `YYYY-MM-DD` (UTC). */
    end: string;
    /** Current granularity. */
    granularity: Granularity;
    /** Optional className for the wrapping element. */
    className?: string;
}

/** Difference in whole days between two `YYYY-MM-DD` strings. */
function dayDiff(a: string, b: string): number {
    const ta = Date.parse(`${a}T00:00:00Z`);
    const tb = Date.parse(`${b}T00:00:00Z`);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return Math.round((tb - ta) / MS_PER_DAY);
}

/** Shift a `YYYY-MM-DD` string by `days` and return a new `YYYY-MM-DD`. */
function shiftDay(day: string, days: number): string {
    const t = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(t)) return day;
    return new Date(t + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function ReportFilters({
    start,
    end,
    granularity,
    className,
}: ReportFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const pushParams = React.useCallback(
        (next: { start: string; end: string; granularity: Granularity }) => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            params.set("start", next.start);
            params.set("end", next.end);
            params.set("granularity", next.granularity);
            const target = pathname ?? "/dashboard/reports";
            router.replace(`${target}?${params.toString()}`, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const onStartChange = React.useCallback(
        (value: string) => {
            if (!value) return;
            let nextEnd = end;
            // Keep end >= start and within the 365-day window.
            if (dayDiff(value, nextEnd) < 0) nextEnd = value;
            if (dayDiff(value, nextEnd) > MAX_RANGE_DAYS) {
                nextEnd = shiftDay(value, MAX_RANGE_DAYS);
            }
            pushParams({ start: value, end: nextEnd, granularity });
        },
        [end, granularity, pushParams],
    );

    const onEndChange = React.useCallback(
        (value: string) => {
            if (!value) return;
            let nextStart = start;
            if (dayDiff(nextStart, value) < 0) nextStart = value;
            if (dayDiff(nextStart, value) > MAX_RANGE_DAYS) {
                nextStart = shiftDay(value, -MAX_RANGE_DAYS);
            }
            pushParams({ start: nextStart, end: value, granularity });
        },
        [start, granularity, pushParams],
    );

    const onGranularityChange = React.useCallback(
        (value: string) => {
            const next = (GRANULARITIES as readonly string[]).includes(value)
                ? (value as Granularity)
                : granularity;
            pushParams({ start, end, granularity: next });
        },
        [start, end, granularity, pushParams],
    );

    return (
        <div
            role="region"
            aria-label="Report filters"
            data-slot="report-filters"
            className={cn(
                "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end",
                className,
            )}
        >
            <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-[12rem]">
                <Label htmlFor="report-start" className="text-xs text-muted-foreground">
                    Start date
                </Label>
                <input
                    id="report-start"
                    type="date"
                    value={start}
                    max={end}
                    onChange={(e) => onStartChange(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Report start date"
                />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-[12rem]">
                <Label htmlFor="report-end" className="text-xs text-muted-foreground">
                    End date
                </Label>
                <input
                    id="report-end"
                    type="date"
                    value={end}
                    min={start}
                    onChange={(e) => onEndChange(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Report end date"
                />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-[12rem]">
                <Label
                    htmlFor="report-granularity"
                    className="text-xs text-muted-foreground"
                >
                    Granularity
                </Label>
                <Select value={granularity} onValueChange={onGranularityChange}>
                    <SelectTrigger
                        id="report-granularity"
                        className="w-full"
                        aria-label="Report time granularity"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {GRANULARITIES.map((g) => (
                            <SelectItem key={g} value={g}>
                                {GRANULARITY_LABELS[g]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

export default ReportFilters;
