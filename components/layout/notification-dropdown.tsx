"use client";

/**
 * Notifications popover content rendered next to the navbar bell.
 *
 * Behaviour:
 *   - Lazily loads up to 20 most-recent notifications via
 *     `getRecentNotificationsAction` on the first time the dropdown opens.
 *   - Shows a spinner skeleton while loading and an empty state when the
 *     user has no notifications.
 *   - Each row renders the message and a relative timestamp (e.g.
 *     "2 minutes ago").
 *   - Clicking a notification marks it as read (`markAsRead` Server
 *     Action) and navigates to the entity it relates to:
 *       - `APPLICATION_STATUS_CHANGE`  → `/my-applications`
 *       - `SCHOLARSHIP_APPROVED`       → `/scholarships/<relatedEntityId>`
 *       - `PAYMENT_CONFIRMED`          → `/my-applications`
 *   - "Mark all as read" link at the bottom calls `markAllAsRead`.
 *   - "View all" link at the very bottom navigates to `/notifications`.
 *
 * The component is rendered inside the parent's `DropdownMenu` Root so
 * Radix handles outside-click + escape-to-close + focus management for
 * us. We use plain anchors instead of `DropdownMenuItem` rows because
 * those add menu-style keyboard semantics (typeahead etc.) that don't
 * suit a notifications feed.
 *
 * Validates: Requirements 33.4, 33.5, 33.6.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    getRecentNotificationsAction,
    markAllAsRead,
    markAsRead,
} from "@/actions/notification";
import type { NotificationDTO } from "@/lib/queries/dto";

interface NotificationDropdownProps {
    /** Mirrors the parent DropdownMenu's open state so we know when to load. */
    open: boolean;
    /** Called after a successful mutation so the parent can refresh count. */
    onMutated?: () => void;
}

/** Time units descending from year → second. */
const RELATIVE_UNITS: Array<{
    unit: Intl.RelativeTimeFormatUnit;
    seconds: number;
}> = [
        { unit: "year", seconds: 31_536_000 },
        { unit: "month", seconds: 2_592_000 },
        { unit: "week", seconds: 604_800 },
        { unit: "day", seconds: 86_400 },
        { unit: "hour", seconds: 3_600 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 },
    ];

/**
 * Format an ISO timestamp as a relative phrase like "5 minutes ago" using
 * Intl.RelativeTimeFormat. Falls back to the raw ISO string on parse
 * failures so the row is never empty.
 */
function formatRelative(iso: string, now: Date = new Date()): string {
    const date = new Date(iso);
    const ms = date.getTime();
    if (Number.isNaN(ms)) return iso;

    const diffSeconds = Math.round((ms - now.getTime()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    if (absSeconds < 5) return "just now";

    for (const { unit, seconds } of RELATIVE_UNITS) {
        if (absSeconds >= seconds || unit === "second") {
            const value = Math.round(diffSeconds / seconds);
            return new Intl.RelativeTimeFormat("en-US", {
                numeric: "auto",
            }).format(value, unit);
        }
    }

    return iso;
}

/**
 * Resolve the navigation target for a notification. Falls back to the
 * notifications page when no entity is referenced.
 */
function targetHrefFor(n: NotificationDTO): string {
    switch (n.type) {
        case "APPLICATION_STATUS_CHANGE":
        case "PAYMENT_CONFIRMED":
            return "/my-applications";
        case "SCHOLARSHIP_APPROVED":
            return n.relatedEntityId
                ? `/scholarships/${n.relatedEntityId}`
                : "/notifications";
        default:
            return "/notifications";
    }
}

export function NotificationDropdown({
    open,
    onMutated,
}: NotificationDropdownProps) {
    const router = useRouter();
    const [loaded, setLoaded] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [items, setItems] = React.useState<NotificationDTO[]>([]);
    const [busy, setBusy] = React.useState(false);

    // Lazy-load the latest 20 the first time the dropdown opens. We always
    // refresh on subsequent opens so the user sees fresh content after a
    // background poll has bumped the count.
    React.useEffect(() => {
        if (!open) return;
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            try {
                const result = await getRecentNotificationsAction();
                if (cancelled) return;
                if (result.ok) {
                    setItems(result.data);
                } else {
                    setItems([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setLoaded(true);
                }
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [open]);

    const handleClickItem = React.useCallback(
        async (n: NotificationDTO, event: React.MouseEvent) => {
            event.preventDefault();
            if (busy) return;

            const href = targetHrefFor(n);

            // Optimistic local update so the row visibly transitions to
            // "read" before we round-trip.
            setItems((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
            );

            setBusy(true);
            try {
                if (!n.isRead) {
                    const result = await markAsRead(n.id);
                    if (!result.ok) {
                        // Roll back optimistic flip and alert the user.
                        setItems((prev) =>
                            prev.map((x) =>
                                x.id === n.id ? { ...x, isRead: false } : x,
                            ),
                        );
                        toast.error(
                            result.error.message ||
                            "Could not mark notification as read.",
                        );
                        setBusy(false);
                        return;
                    }
                }
                onMutated?.();
                router.push(href);
                router.refresh();
            } finally {
                setBusy(false);
            }
        },
        [busy, onMutated, router],
    );

    const handleMarkAll = React.useCallback(
        async (event: React.MouseEvent | React.KeyboardEvent) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            const previous = items;
            // Optimistic flip-all.
            setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
            try {
                const result = await markAllAsRead();
                if (!result.ok) {
                    setItems(previous);
                    toast.error(
                        result.error.message ||
                        "Could not mark all as read.",
                    );
                    return;
                }
                onMutated?.();
                router.refresh();
            } finally {
                setBusy(false);
            }
        },
        [busy, items, onMutated, router],
    );

    const hasUnread = React.useMemo(
        () => items.some((n) => !n.isRead),
        [items],
    );

    return (
        <DropdownMenuContent
            align="end"
            className="w-80 p-0"
        // Force narrower padding around our custom content layout.
        >
            <header className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-semibold">Notifications</p>
                <button
                    type="button"
                    onClick={handleMarkAll}
                    disabled={!hasUnread || busy}
                    className={cn(
                        "inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs font-medium",
                        "text-muted-foreground hover:text-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                >
                    <CheckCheck className="size-3.5" aria-hidden />
                    Mark all as read
                </button>
            </header>

            <div className="max-h-96 overflow-y-auto">
                {!loaded && loading ? (
                    <div className="space-y-2 p-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex flex-col gap-1 rounded-md p-2"
                            >
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <span
                            aria-hidden
                            className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        >
                            <Bell className="size-5" />
                        </span>
                        <p className="text-sm font-medium">
                            You&apos;re all caught up
                        </p>
                        <p className="text-xs text-muted-foreground">
                            New notifications will appear here.
                        </p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y">
                        {items.map((n) => {
                            const href = targetHrefFor(n);
                            return (
                                <li key={n.id}>
                                    <a
                                        href={href}
                                        onClick={(event) =>
                                            void handleClickItem(n, event)
                                        }
                                        className={cn(
                                            "flex flex-col gap-1 px-3 py-2.5 text-sm",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            "focus-visible:outline-none focus-visible:bg-accent",
                                            !n.isRead && "bg-accent/40",
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            {!n.isRead ? (
                                                <span
                                                    aria-hidden
                                                    className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-primary"
                                                />
                                            ) : (
                                                <span
                                                    aria-hidden
                                                    className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-transparent"
                                                />
                                            )}
                                            <p
                                                className={cn(
                                                    "line-clamp-3 flex-1",
                                                    !n.isRead && "font-medium",
                                                )}
                                            >
                                                {n.message}
                                            </p>
                                        </div>
                                        <time
                                            dateTime={n.createdAt}
                                            className="pl-4 text-xs text-muted-foreground"
                                        >
                                            {formatRelative(n.createdAt)}
                                        </time>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <footer className="border-t p-2">
                <Link
                    href="/notifications"
                    className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    View all notifications
                </Link>
            </footer>
        </DropdownMenuContent>
    );
}
