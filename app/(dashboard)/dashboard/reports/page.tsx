/**
 * Admin Reports page.
 *
 * Server component that renders platform-activity reports over an
 * admin-selectable date window. The window and time-series granularity are
 * URL-driven (`?start`, `?end`, `?granularity`) so the view is shareable and
 * re-queries on the server whenever the `ReportFilters` client island
 * rewrites the params.
 *
 * URL contract (parsed by `parseReportParams` in `lib/reports.ts`):
 *   - `start` / `end`   — `YYYY-MM-DD` UTC calendar days. Defaults to the
 *                         last 30 days; the window is clamped to a 365-day
 *                         maximum (Req 31.1).
 *   - `granularity`     — `daily | weekly | monthly` (default `daily`),
 *                         controls the registration-trend bucketing
 *                         (Req 31.3) and the category/status windows
 *                         (Req 31.2).
 *
 * Data flow:
 *   1. Resolve the validated window via `parseReportParams`.
 *   2. Fetch the three datasets in parallel:
 *      - `getApplicationStatsByStatus`   (Req 31.2)
 *      - `getApplicationStatsByCategory` (Req 31.2)
 *      - `getRegistrationTrend`          (Req 31.3)
 *   3. When every dataset is empty for the window, render an `EmptyState`
 *      instead of empty charts (Req 31.5).
 *   4. Otherwise hand the data to the `ReportCharts` client island, which
 *      lazy-loads Recharts and hosts the "Export CSV" button.
 *
 * Access is already gated to `ADMIN`/`MODERATOR` by the `(dashboard)`
 * layout. The page is dynamic (admins expect fresh numbers on every load),
 * so caching is intentionally disabled.
 *
 * Validates: Requirements 31.1, 31.2, 31.3, 31.5.
 */

import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ReportCharts } from "@/components/dashboard/report-charts";
import { ReportFilters } from "@/components/dashboard/report-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/intl";
import { parseReportParams, toDateInputValue } from "@/lib/reports";
import {
    getApplicationStatsByCategory,
    getApplicationStatsByStatus,
    getRegistrationTrend,
} from "@/lib/queries/stats";
import { buildMetadata } from "@/lib/seo";

/** Admins expect live numbers — never serve a cached render. */
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "Reports | ScholarVista",
        description:
            "Platform activity reports: application statistics, category breakdowns, and user registration trends.",
        path: "/dashboard/reports",
    });
}

/** Status order rendered on the chart/table (matches the enum order). */
const STATUS_ORDER = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"] as const;

interface ReportsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Collapse a possibly-array search param into a single string. */
function firstParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
    const raw = await searchParams;
    const { start, end, granularity } = parseReportParams({
        start: firstParam(raw.start),
        end: firstParam(raw.end),
        granularity: firstParam(raw.granularity),
    });

    const [statusCounts, categoryCounts, trend] = await Promise.all([
        getApplicationStatsByStatus({ start, end }),
        getApplicationStatsByCategory({ start, end }),
        getRegistrationTrend({ start, end, granularity }),
    ]);

    const statusData = STATUS_ORDER.map((status) => ({
        status,
        count: statusCounts[status],
    }));
    const categoryData = categoryCounts.map((c) => ({
        category: c.category,
        count: c.count,
    }));
    const trendData = trend.map((b) => ({
        bucketIso: b.bucketIso,
        count: b.count,
    }));

    // Empty state: no applications and no registrations in the window (Req 31.5).
    const totalApplications = statusData.reduce((sum, d) => sum + d.count, 0);
    const totalRegistrations = trendData.reduce((sum, d) => sum + d.count, 0);
    const hasData = totalApplications > 0 || totalRegistrations > 0;

    const startInput = toDateInputValue(start);
    const endInput = toDateInputValue(end);

    const labelOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    };
    const rangeLabel = `${formatDate(start, undefined, labelOptions)} – ${formatDate(
        end,
        undefined,
        labelOptions,
    )}`;

    return (
        <section
            aria-labelledby="reports-heading"
            className="mx-auto max-w-7xl space-y-6"
        >
            <header className="space-y-1">
                <h1
                    id="reports-heading"
                    className="text-2xl font-semibold tracking-tight"
                >
                    Reports
                </h1>
                <p className="text-sm text-muted-foreground">
                    Platform activity for {rangeLabel}.
                </p>
            </header>

            <ReportFilters
                start={startInput}
                end={endInput}
                granularity={granularity}
            />

            {hasData ? (
                <ReportCharts
                    statusData={statusData}
                    categoryData={categoryData}
                    trendData={trendData}
                    granularity={granularity}
                    start={startInput}
                    end={endInput}
                />
            ) : (
                <EmptyState
                    title="No records for the selected period"
                    description="There were no applications or new registrations between the selected dates. Try widening the date range."
                    icon={BarChart3}
                />
            )}
        </section>
    );
}
