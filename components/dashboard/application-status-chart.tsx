"use client";

/**
 * Application-status breakdown chart for the admin Reports page.
 *
 * Renders the number of applications in each lifecycle status (PENDING,
 * PROCESSING, COMPLETED, REJECTED) over the selected date window as a
 * responsive Recharts `BarChart`. Each bar uses a status-specific theme
 * token so the colour doubles as a status cue, and the human-readable
 * status label is shown on the axis and tooltip.
 *
 * The data shape matches `ApplicationStatusCounts` from
 * `lib/queries/stats`, flattened to `{ status, count }[]` by the page.
 *
 * Recharts is client-only, so this is a client island the Reports page
 * lazy-loads via `next/dynamic`.
 *
 * Validates: Requirement 31.2 (application statistics grouped by status).
 */

import * as React from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { formatNumber } from "@/lib/intl";
import { cn } from "@/lib/utils";

/** Per-status palette — colour acts as a redundant status cue. */
const STATUS_COLORS: Record<string, string> = {
    PENDING: "var(--chart-4)",
    PROCESSING: "var(--chart-1)",
    COMPLETED: "var(--chart-2)",
    REJECTED: "var(--destructive)",
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
};

export interface ApplicationStatusDatum {
    /** Raw status identifier, e.g. `"PENDING"`. */
    status: string;
    /** Number of applications in the status. */
    count: number;
}

export interface ApplicationStatusChartProps {
    /** One entry per status. */
    data: ApplicationStatusDatum[];
    /** BCP-47 locale used for numeric tooltips. Defaults to the app default. */
    locale?: string;
    /** Chart height in pixels. Defaults to 320. */
    height?: number;
    /** Extra classes for the wrapping element. */
    className?: string;
}

interface ChartRow {
    status: string;
    label: string;
    count: number;
}

/**
 * Responsive bar chart of application counts by status. Renders inside a
 * `ResponsiveContainer` so it fills its parent width.
 */
export function ApplicationStatusChart({
    data,
    locale,
    height = 320,
    className,
}: ApplicationStatusChartProps) {
    const rows: ChartRow[] = React.useMemo(
        () =>
            data.map((d) => ({
                status: d.status,
                label: STATUS_LABELS[d.status] ?? d.status,
                count: d.count,
            })),
        [data],
    );

    return (
        <div
            data-slot="application-status-chart"
            className={cn("w-full", className)}
            style={{ height }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
                        interval={0}
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
                        cursor={{ fill: "var(--muted)", opacity: 0.3 }}
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
                    <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
                        {rows.map((row) => (
                            <Cell
                                key={row.status}
                                fill={STATUS_COLORS[row.status] ?? "var(--chart-1)"}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default ApplicationStatusChart;
