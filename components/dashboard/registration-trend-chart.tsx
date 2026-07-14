"use client";

/**
 * User-registration trend line chart for the admin Reports page.
 *
 * Plots the count of new user registrations per time bucket across the
 * selected date window as a responsive Recharts `LineChart`. Bucket labels
 * are derived from each bucket's ISO timestamp via `Intl.DateTimeFormat`
 * (through `formatDate`) and adapt to the chosen granularity:
 *   - daily   → `"Jan 5"`
 *   - weekly  → `"Jan 5"` (week-start anchor)
 *   - monthly → `"Jan 2024"`
 *
 * The data shape matches `TimeBucket` from `lib/queries/dto`:
 * `{ bucketIso, count }`.
 *
 * Recharts is client-only, so this is a client island the Reports page
 * lazy-loads via `next/dynamic`.
 *
 * Validates: Requirement 31.3 (registration trend as a line chart).
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
import type { Granularity } from "@/lib/reports";
import { cn } from "@/lib/utils";

export interface RegistrationTrendDatum {
    /** ISO-8601 timestamp anchored at the start of the bucket window. */
    bucketIso: string;
    /** Number of registrations within the bucket. */
    count: number;
}

export interface RegistrationTrendChartProps {
    /** One entry per bucket, oldest first. */
    data: RegistrationTrendDatum[];
    /** Bucket granularity — controls the axis label format. */
    granularity: Granularity;
    /** BCP-47 locale used for labels/tooltips. Defaults to the app default. */
    locale?: string;
    /** Chart height in pixels. Defaults to 320. */
    height?: number;
    /** Extra classes for the wrapping element. */
    className?: string;
}

interface ChartRow {
    bucketIso: string;
    label: string;
    count: number;
}

/** Format a bucket anchor according to granularity. */
function bucketLabel(
    bucketIso: string,
    granularity: Granularity,
    locale?: string,
): string {
    const options: Intl.DateTimeFormatOptions =
        granularity === "monthly"
            ? { month: "short", year: "numeric", timeZone: "UTC" }
            : { month: "short", day: "numeric", timeZone: "UTC" };
    return formatDate(bucketIso, locale, options);
}

/**
 * Responsive line chart of registration counts per bucket. Renders inside a
 * `ResponsiveContainer` so it fills its parent width.
 */
export function RegistrationTrendChart({
    data,
    granularity,
    locale,
    height = 320,
    className,
}: RegistrationTrendChartProps) {
    const rows: ChartRow[] = React.useMemo(
        () =>
            data.map((d) => ({
                bucketIso: d.bucketIso,
                label: bucketLabel(d.bucketIso, granularity, locale),
                count: d.count,
            })),
        [data, granularity, locale],
    );

    return (
        <div
            data-slot="registration-trend-chart"
            className={cn("w-full", className)}
            style={{ height }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
                        minTickGap={24}
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
                        cursor={{ stroke: "var(--chart-3)", strokeWidth: 1 }}
                        contentStyle={{
                            backgroundColor: "var(--popover)",
                            borderColor: "var(--border)",
                            borderRadius: "var(--radius, 0.5rem)",
                            color: "var(--popover-foreground)",
                            fontSize: 12,
                        }}
                        labelStyle={{ color: "var(--foreground)" }}
                        formatter={(value) => [formatNumber(Number(value), locale), "Registrations"]}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        name="Registrations"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "var(--chart-3)" }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default RegistrationTrendChart;
