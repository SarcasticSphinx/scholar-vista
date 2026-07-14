"use client";

/**
 * Reports page chart surface (client island).
 *
 * Lazy-loads the three Recharts charts (application status, category
 * breakdown, registration trend) via `next/dynamic` with `ssr: false` and a
 * Skeleton fallback — their bundles routinely exceed 50KB and are only ever
 * rendered on the client (Recharts needs layout), so keeping them out of the
 * server bundle and the initial JS payload is a deliberate perf choice (see
 * design §Performance). This component also hosts the "Export CSV" button so
 * the export always reflects exactly the data the charts display.
 *
 * Validates: Requirements 31.2, 31.3, 31.4, 31.6.
 */

import * as React from "react";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Granularity } from "@/lib/reports";

import {
    ExportReportButton,
    type ReportSection,
} from "./export-report-button";

const CHART_HEIGHT = 320;

/** Shared skeleton fallback while a chart bundle loads. */
function ChartSkeleton() {
    return <Skeleton className="w-full" style={{ height: CHART_HEIGHT }} />;
}

const ApplicationStatusChart = dynamic(
    () =>
        import("./application-status-chart").then((m) => m.ApplicationStatusChart),
    { ssr: false, loading: () => <ChartSkeleton /> },
);

const CategoryDistributionChart = dynamic(
    () =>
        import("./category-distribution-chart").then(
            (m) => m.CategoryDistributionChart,
        ),
    { ssr: false, loading: () => <ChartSkeleton /> },
);

const RegistrationTrendChart = dynamic(
    () =>
        import("./registration-trend-chart").then((m) => m.RegistrationTrendChart),
    { ssr: false, loading: () => <ChartSkeleton /> },
);

export interface ReportChartsProps {
    statusData: { status: string; count: number }[];
    categoryData: { category: string; count: number }[];
    trendData: { bucketIso: string; count: number }[];
    granularity: Granularity;
    /** `YYYY-MM-DD` window bounds, used for the export filename. */
    start: string;
    end: string;
}

/** Convert an enum-ish identifier to a Title Case label. */
function humanize(value: string): string {
    return value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReportCharts({
    statusData,
    categoryData,
    trendData,
    granularity,
    start,
    end,
}: ReportChartsProps) {
    const exportSections: ReportSection[] = React.useMemo(
        () => [
            {
                title: "Applications by status",
                keyHeader: "Status",
                rows: statusData.map((d) => ({
                    label: humanize(d.status),
                    value: d.count,
                })),
            },
            {
                title: "Applications by category",
                keyHeader: "Category",
                rows: categoryData.map((d) => ({
                    label: humanize(d.category),
                    value: d.count,
                })),
            },
            {
                title: `Registrations (${granularity})`,
                keyHeader: "Period",
                rows: trendData.map((d) => ({
                    label: d.bucketIso,
                    value: d.count,
                })),
            },
        ],
        [statusData, categoryData, trendData, granularity],
    );

    return (
        <div className="space-y-6" data-slot="report-charts">
            <div className="flex justify-end">
                <ExportReportButton sections={exportSections} start={start} end={end} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Applications by status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ApplicationStatusChart data={statusData} height={CHART_HEIGHT} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Applications by category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CategoryDistributionChart
                            data={categoryData}
                            height={CHART_HEIGHT}
                        />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Registration trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <RegistrationTrendChart
                        data={trendData}
                        granularity={granularity}
                        height={CHART_HEIGHT}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default ReportCharts;
