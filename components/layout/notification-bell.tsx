"use client";

/**
 * Navbar notification bell.
 *
 * Renders a bell icon button with an unread-count badge. The badge:
 *   - Shows the exact count up to `99`.
 *   - Renders `99+` when the count exceeds 99.
 *   - Is hidden entirely when the count is 0 (Req 33.6).
 *
 * The badge polls `/api/notifications/unread-count` every 60s so the
 * count stays roughly in sync without a websocket. It also refetches:
 *   - On window `focus` (in case other tabs marked things read).
 *   - When the dropdown closes (so optimistic mark-as-read state lines up).
 *
 * Clicking the bell opens `NotificationDropdown` which lazily fetches
 * the latest 20 notifications via the `getRecentNotificationsAction`
 * Server Action.
 *
 * Validates: Requirements 33.2, 33.3, 33.4, 33.5, 33.6.
 */

import * as React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";

const POLL_INTERVAL_MS = 60_000;

/** Render-friendly badge string. Hidden when count is 0. */
function formatBadge(count: number): string | null {
    if (count <= 0) return null;
    if (count > 99) return "99+";
    return String(count);
}

export interface NotificationBellProps {
    /**
     * Optional initial count from the server. When provided the badge
     * paints immediately on first render and is replaced by the polled
     * value on the next tick.
     */
    initialCount?: number;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
    const [count, setCount] = React.useState<number>(initialCount);
    const [open, setOpen] = React.useState(false);

    /** Refresh the count from the API. Resilient to network failures. */
    const refresh = React.useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await fetch("/api/notifications/unread-count", {
                method: "GET",
                cache: "no-store",
                credentials: "same-origin",
                signal,
            });
            if (!res.ok) return;
            const data = (await res.json()) as { count?: unknown };
            const next =
                typeof data.count === "number" && Number.isFinite(data.count)
                    ? Math.max(0, Math.floor(data.count))
                    : 0;
            setCount(next);
        } catch {
            // Network / abort errors are silent; the next poll will retry.
        }
    }, []);

    // Poll every 60s, plus on focus, plus on dropdown close.
    React.useEffect(() => {
        const controller = new AbortController();

        // Kick off an immediate refresh so SSR's initialCount catches up.
        void refresh(controller.signal);

        const interval = window.setInterval(() => {
            void refresh(controller.signal);
        }, POLL_INTERVAL_MS);

        const onFocus = () => {
            void refresh(controller.signal);
        };
        window.addEventListener("focus", onFocus);

        return () => {
            controller.abort();
            window.clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, [refresh]);

    // When the dropdown closes (after the user marked things read), refresh.
    const previousOpen = React.useRef(open);
    React.useEffect(() => {
        if (previousOpen.current && !open) {
            void refresh();
        }
        previousOpen.current = open;
    }, [open, refresh]);

    const badge = formatBadge(count);
    const ariaLabel =
        count > 0
            ? `Notifications (${badge} unread)`
            : "Notifications (none unread)";

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={ariaLabel}
                    className="relative"
                >
                    <Bell className="size-5" aria-hidden />
                    {badge ? (
                        <span
                            // Live region so screen readers hear updates
                            // without being noisy.
                            aria-live="polite"
                            className={cn(
                                "absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center",
                                "rounded-full bg-destructive px-1 py-0.5 text-[10px] font-semibold leading-none",
                                "text-destructive-foreground ring-2 ring-background",
                            )}
                        >
                            {badge}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>

            {/*
              The dropdown content is rendered as a sibling inside the
              same DropdownMenu Root. It owns its own data fetching so
              this component can stay focused on the badge.
            */}
            <NotificationDropdown
                open={open}
                onMutated={() => {
                    void refresh();
                }}
            />
        </DropdownMenu>
    );
}
