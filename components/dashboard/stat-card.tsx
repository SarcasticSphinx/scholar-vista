/**
 * Dashboard summary stat tile.
 *
 * A presentational, server-friendly component (no client hooks, no
 * `"use client"`) that renders a single headline metric: an optional icon,
 * a label, a formatted value, and an optional trend / description line. The
 * dashboard summary page composes a grid of these for the total counts of
 * scholarships, universities, users, and applications.
 *
 * The caller is responsible for formatting the value (e.g. via
 * `formatNumber` from `lib/intl`) so the component stays purely
 * presentational and locale decisions live with the data source.
 *
 * Validates: Requirement 16.3 (dashboard summary tiles).
 */

import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Direction of a trend indicator. */
export type StatTrendDirection = "up" | "down" | "neutral";

export interface StatCardTrend {
    /** Already-formatted trend text, e.g. `"+12%"` or `"3 this week"`. */
    label: string;
    /** Visual treatment of the trend value. Defaults to `"neutral"`. */
    direction?: StatTrendDirection;
}

export interface StatCardProps {
    /** Short metric name rendered above the value. */
    label: string;
    /**
     * Formatted metric value. Accepts a string (pre-formatted) or a number
     * which is rendered as-is — callers should format with `formatNumber`
     * for locale-aware grouping.
     */
    value: string | number;
    /** Optional Lucide icon component shown in the header. */
    icon?: LucideIcon;
    /** Optional supporting copy rendered beneath the value. */
    description?: string;
    /** Optional trend chip rendered beneath the value. */
    trend?: StatCardTrend;
    /** Extra classes for the root card. */
    className?: string;
}

const TREND_CLASSES: Record<StatTrendDirection, string> = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-destructive",
    neutral: "text-muted-foreground",
};

/**
 * Render a single dashboard statistic. Pure presentation — safe to render
 * inside a React Server Component.
 */
export function StatCard({
    label,
    value,
    icon: Icon,
    description,
    trend,
    className,
}: StatCardProps) {
    const trendDirection = trend?.direction ?? "neutral";

    return (
        <Card
            data-slot="stat-card"
            className={cn("overflow-hidden", className)}
        >
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                {Icon ? (
                    <span
                        aria-hidden="true"
                        className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand"
                    >
                        <Icon className="size-5" />
                    </span>
                ) : null}
            </CardHeader>
            <CardContent className="space-y-1 p-4 pt-0">
                <p className="text-3xl font-semibold leading-none tracking-tight">
                    {value}
                </p>
                {trend ? (
                    <p className={cn("text-xs font-medium", TREND_CLASSES[trendDirection])}>
                        {trend.label}
                    </p>
                ) : null}
                {description ? (
                    <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}

export default StatCard;
