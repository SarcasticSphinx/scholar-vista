/**
 * Notifications page (`/notifications`).
 *
 * Server-rendered list of the user's notifications, paginated 20 per page
 * via `listNotificationsByUser`. Each row shows the message, the relative
 * timestamp, and a navigation link to the related entity. The page uses
 * the same target-resolution rules as the navbar dropdown so the user's
 * mental model stays consistent.
 *
 * "Mark all as read" is rendered at the top of the list as a server-form
 * that calls `markAllAsRead` and then `revalidatePath('/notifications')`,
 * which refreshes the page and the bell badge in one round-trip.
 *
 * Validates: Requirements 33.4, 33.5, 33.6.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { listNotificationsByUser } from "@/lib/queries/notification";
import { markAllAsRead } from "@/actions/notification";
import { requireSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/queries/dto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
    title: "Notifications | ScholarVista",
    description: "Your scholarship application updates and announcements.",
    path: "/notifications",
});

const PAGE_SIZE = 20;

interface PageSearchParams {
    page?: string | string[];
}

interface NotificationsPageProps {
    searchParams: Promise<PageSearchParams>;
}

/** Same routing rules as the navbar dropdown. */
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

function parsePage(raw: string | string[] | undefined): number {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number.parseInt(value ?? "1", 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

/**
 * Server Action target for the "Mark all as read" form. Wraps the action
 * so we can reuse the same error-handling path everywhere — the form
 * itself doesn't need branching because we just refresh the page on
 * either outcome.
 */
async function markAllAction(): Promise<void> {
    "use server";
    await markAllAsRead();
}

export default async function NotificationsPage({
    searchParams,
}: NotificationsPageProps) {
    let session;
    try {
        session = await requireSession();
    } catch {
        redirect("/sign-in?returnUrl=/notifications");
    }

    const params = await searchParams;
    const requestedPage = parsePage(params.page);

    const result = await listNotificationsByUser(
        session.user.id,
        requestedPage,
        PAGE_SIZE,
    );
    const { items, page, totalPages, total } = result;

    const hasUnread = items.some((n) => !n.isRead);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Notifications
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {total === 0
                            ? "You don't have any notifications yet."
                            : `${total} notification${total === 1 ? "" : "s"} total`}
                    </p>
                </div>
                {hasUnread ? (
                    <form action={markAllAction}>
                        <Button type="submit" size="sm" variant="outline">
                            Mark all as read
                        </Button>
                    </form>
                ) : null}
            </header>

            {items.length === 0 ? (
                <EmptyState
                    icon={Bell}
                    title="No notifications"
                    description="When your application status changes or admins post updates, you'll see them here."
                    action={{ label: "Browse scholarships", href: "/scholarships" }}
                />
            ) : (
                <>
                    <ul
                        role="list"
                        className="divide-y rounded-lg border bg-card"
                    >
                        {items.map((n) => {
                            const href = targetHrefFor(n);
                            return (
                                <li key={n.id}>
                                    <Link
                                        href={href}
                                        className={cn(
                                            "flex flex-col gap-1 px-4 py-3 text-sm transition-colors",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            "focus-visible:outline-none focus-visible:bg-accent",
                                            !n.isRead && "bg-accent/30",
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                                                    !n.isRead
                                                        ? "bg-primary"
                                                        : "bg-transparent",
                                                )}
                                            />
                                            <p
                                                className={cn(
                                                    "flex-1",
                                                    !n.isRead && "font-medium",
                                                )}
                                            >
                                                {n.message}
                                            </p>
                                            {!n.isRead ? (
                                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                    New
                                                </span>
                                            ) : null}
                                        </div>
                                        <time
                                            dateTime={n.createdAt}
                                            className="pl-4 text-xs text-muted-foreground"
                                        >
                                            {formatRelative(n.createdAt)}
                                        </time>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {totalPages > 1 ? (
                        <div className="mt-6">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                baseUrl="/notifications"
                            />
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
