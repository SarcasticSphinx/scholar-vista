"use client";

/**
 * Scholarship category-distribution chart for the admin dashboard.
 *
 * Renders the count of approved scholarships per category as a responsive
 * Recharts `BarChart`. Each bar cycles through the theme's `--chart-1`
 * … `--chart-5` CSS variables so the palette stays consistent with the rest
 * of the UI and adapts to light/dark mode.
 *
 * The data shape matches `CategoryCount` from `lib/queries/stats`:
 * `{ category, count }`. Raw enum category names (e.g. `SHORT_COURSE`) are
 * converted to human-friendly labels for the axis.
 *
 * Recharts is client-only, so this component is a client island the
 * dashboard page lazy-loads via `next/dynamic`.
 *
 * Validates: Requirement 16.3 (scholarship distribution by category).
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

/** Theme-aware palette — cycles across the five chart tokens. */
const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
] as const;

export interface CategoryDistributionDatum {
    /** Raw category identifier (enum value), e.g. `"SHORT_COURSE"`. */
    category: string;
    /** Number of scholarships in the category. */
    count: number;
}

export interface CategoryDistributionChartProps {
    /** One entry per category. */
    data: CategoryDistributionDatum[];
    /** BCP-47 locale used for numeric tooltips. Defaults to the app default. */
    locale?: string;
    /** Chart height in pixels. Defaults to 320. */
    height?: number;
    /** Extra classes for the wrapping element. */
    className?: string;
}

interface ChartRow {
    category: string;
    label: string;
    count: number;
}

/** Convert an enum category to a human-friendly label (no underscores). */
function categoryLabel(category: string): string {
    return category
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Responsive bar chart of scholarship counts by category. Renders inside a
 * `ResponsiveContainer` so it fills its parent width.
 */
export function CategoryDistributionChart({
    data,
    locale,
    height = 320,
    className,
}: CategoryDistributionChartProps) {
    const rows: ChartRow[] = React.useMemo(
        () =>
            data.map((d) => ({
                category: d.category,
                label: categoryLabel(d.category),
                count: d.count,
            })),
        [data],
    );

    return (
        <div
            data-slot="category-distribution-chart"
            className={cn("w-full", className)}
            style={{ height }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
                        formatter={(value) => [formatNumber(Number(value), locale), "Scholarships"]}
                    />
                    <Bar dataKey="count" name="Scholarships" radius={[4, 4, 0, 0]}>
                        {rows.map((row, index) => (
                            <Cell
                                key={row.category}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default CategoryDistributionChart;
