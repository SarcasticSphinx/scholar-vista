"use client";

/**
 * Application-trend line chart for the admin dashboard.
 *
 * Plots application counts across the most recent 12 months as a responsive
 * Recharts `LineChart`. Month labels are derived from each bucket's ISO
 * timestamp via `Intl.DateTimeFormat` (through `formatDate`) so they respect
 * locale formatting. Colors come from the theme's `--chart-1` CSS variable
 * so the chart adapts to light/dark mode automatically.
 *
 * The data shape matches `MonthBucket` from `lib/queries/dto` /
 * `applicationTrendByMonth`: `{ monthIso, count }`.
 *
 * Recharts is client-only, so this component is a client island that the
 * dashboard page lazy-loads via `next/dynamic`.
 *
 * Validates: Requirement 16.3 (12-month application trend chart).
 */

import * as React from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { formatDate, formatNumber } from "@/lib/intl";
import { cn } from "@/lib/utils";

export interface ApplicationsTrendDatum {
    /** ISO-8601 timestamp anchored at the first instant of the month (UTC). */
    monthIso: string;
    /** Number of applications submitted within the month. */
    count: number;
}

export interface ApplicationsTrendChartProps {
    /** One entry per month, oldest first (typically 12 entries). */
    data: ApplicationsTrendDatum[];
    /** BCP-47 locale used for month labels. Defaults to the app default. */
    locale?: string;
    /** Chart height in pixels. Defaults to 320. */
    height?: number;
    /** Extra classes for the wrapping element. */
    className?: string;
}

interface ChartRow {
    monthIso: string;
    label: string;
    count: number;
}

/** Format an ISO month anchor as a short `"Mon YYYY"` label. */
function monthLabel(monthIso: string, locale?: string): string {
    return formatDate(monthIso, locale, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

/**
 * Responsive line chart of monthly application counts. Renders inside a
 * `ResponsiveContainer` so it fills its parent width.
 */
export function ApplicationsTrendChart({
    data,
    locale,
    height = 320,
    className,
}: ApplicationsTrendChartProps) {
    const rows: ChartRow[] = React.useMemo(
        () =>
            data.map((d) => ({
                monthIso: d.monthIso,
                label: monthLabel(d.monthIso, locale),
                count: d.count,
            })),
        [data, locale],
    );

    return (
        <div
            data-slot="applications-trend-chart"
            className={cn("w-full", className)}
            style={{ height }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={rows}
                    margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        allowDecimals={false}
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                    />
                    <Tooltip
                        cursor={{ stroke: "var(--chart-1)", strokeWidth: 1 }}
                        contentStyle={{
                            backgroundColor: "var(--popover)",
                            borderColor: "var(--border)",
                            borderRadius: "var(--radius, 0.5rem)",
                            color: "var(--popover-foreground)",
                            fontSize: 12,
                        }}
                        labelStyle={{ color: "var(--foreground)" }}
                        formatter={(value) => [formatNumber(Number(value), locale), "Applications"]}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        name="Applications"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "var(--chart-1)" }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default ApplicationsTrendChart;
