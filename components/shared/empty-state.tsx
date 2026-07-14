/**
 * Generic empty-state card for "no results", "nothing here yet", and
 * similar zero-data surfaces. Render a centred icon, title, optional
 * description, and an optional call-to-action link.
 *
 * Used by the browse page (Req 5.10), bookmark / application lists
 * (Req 8.4, 9.4), and admin queues (Req 21.x).
 *
 * Validates: Requirements 4.6, 5.9, 25.2 (shared list scaffolding).
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
    /** Visible CTA label. */
    label: string;
    /** Internal href the CTA navigates to. */
    href: string;
}

export interface EmptyStateProps {
    /** Heading shown beneath the icon. */
    title: string;
    /** Supporting copy below the heading. */
    description?: string;
    /** Optional Lucide icon — rendered if provided. */
    icon?: LucideIcon;
    /** Optional CTA button rendered at the bottom of the card. */
    action?: EmptyStateAction;
    /** Optional className override for surrounding card. */
    className?: string;
}

/**
 * A centered Card with optional icon, message, and CTA. The card keeps a
 * dashed border so it reads as "intentional emptiness" rather than a
 * loading state.
 */
export function EmptyState({
    title,
    description,
    icon: Icon,
    action,
    className,
}: EmptyStateProps) {
    return (
        <Card
            role="status"
            aria-live="polite"
            className={cn("border-dashed bg-muted/30 shadow-none", className)}
            data-slot="empty-state"
        >
            <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                {Icon ? (
                    <span
                        aria-hidden="true"
                        className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border"
                    >
                        <Icon className="size-6" />
                    </span>
                ) : null}

                <div className="space-y-1">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    {description ? (
                        <p className="max-w-md text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>

                {action ? (
                    <Button asChild size="sm" className="mt-2">
                        <Link href={action.href}>{action.label}</Link>
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    );
}
