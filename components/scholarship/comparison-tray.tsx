"use client";

/**
 * Floating bottom-right tray that surfaces the current comparison cart.
 *
 * Visibility rules (Req 15.5):
 *   - Hidden completely when the cart contains fewer than {@link MIN_COMPARE}
 *     items so it never competes with primary content.
 *   - Visible as a fixed element in the bottom-right corner once the cart
 *     reaches the minimum, listing each selected scholarship with a quick
 *     "Remove" affordance and surfacing primary actions: "Compare" (links
 *     to `/compare`) and "Clear".
 *
 * The tray is intentionally a small, low-contrast surface so it doesn't
 * dominate the viewport. On narrow screens we constrain its width and
 * clip overflow with `truncate` on the row labels so long titles don't
 * push the layout sideways.
 *
 * Accessibility:
 *   - Announced as a region with `aria-label` so assistive tech users can
 *     navigate to it via landmark navigation.
 *   - Each remove control has a label including the scholarship title so
 *     out-of-context announcements remain meaningful.
 *
 * Validates: Requirements 15.5
 */

import * as React from "react";
import Link from "next/link";
import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    MAX_COMPARE,
    MIN_COMPARE,
    useComparison,
} from "@/hooks/use-comparison";
import { cn } from "@/lib/utils";

export interface ComparisonTrayProps {
    /**
     * Optional className override. The tray applies its own positioning
     * styles by default; pass additional classes here only when host pages
     * need to nudge the placement (e.g. lifting above a sticky CTA bar).
     */
    className?: string;
}

export function ComparisonTray({ className }: ComparisonTrayProps) {
    const { items, remove, clear, count } = useComparison();

    // Below the minimum the tray is fully hidden — render nothing rather
    // than an empty container so it doesn't trap focus or take up space.
    if (count < MIN_COMPARE) return null;

    return (
        <aside
            role="region"
            aria-label="Scholarship comparison tray"
            className={cn(
                "fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-xl border bg-background shadow-lg",
                "p-4",
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                    Comparing {count} of {MAX_COMPARE}
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clear}
                    aria-label="Clear comparison"
                >
                    <Trash2 className="size-4" aria-hidden />
                    <span>Clear</span>
                </Button>
            </div>

            <ul className="mt-3 space-y-2">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {item.universityName}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(item.id)}
                            aria-label={`Remove ${item.title} from comparison`}
                        >
                            <X className="size-4" aria-hidden />
                        </Button>
                    </li>
                ))}
            </ul>

            <div className="mt-3 flex justify-end">
                <Button asChild size="sm">
                    <Link href="/compare">Compare</Link>
                </Button>
            </div>
        </aside>
    );
}
