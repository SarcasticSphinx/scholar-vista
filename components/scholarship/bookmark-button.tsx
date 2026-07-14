"use client";

/**
 * Client island that renders the bookmark toggle on a scholarship card.
 *
 * Wraps the `toggleBookmark` Server Action and flips a local `bookmarked`
 * flag optimistically so the icon updates instantly. When the action returns
 * `UNAUTHORIZED` (the user has no session), the button navigates to the
 * sign-in page with a `returnUrl` so the user lands back on the same listing
 * after authenticating.
 *
 * Validates: Requirements 4.6, 5.9, 25.2 (server card + interactive island).
 */

import * as React from "react";
import { Bookmark } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/actions/bookmark";

export interface BookmarkButtonProps {
    /** Scholarship to bookmark. */
    scholarshipId: string;
    /** Initial bookmark state for the current user (false when unauth). */
    initial: boolean;
    /** Optional className override for layout positioning on the card. */
    className?: string;
}

/**
 * Renders a small icon button. Optimistically toggles state, falls back to
 * the action result, and surfaces errors via `sonner` so the user knows when
 * a transient failure happened.
 */
export function BookmarkButton({
    scholarshipId,
    initial,
    className,
}: BookmarkButtonProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [bookmarked, setBookmarked] = React.useState<boolean>(initial);
    const [pending, startTransition] = React.useTransition();

    const onClick = React.useCallback(() => {
        // Optimistic flip — restored on failure.
        const previous = bookmarked;
        setBookmarked(!previous);

        startTransition(async () => {
            const result = await toggleBookmark(scholarshipId);

            if (!result.ok) {
                // Revert optimistic update before reacting.
                setBookmarked(previous);

                if (result.error.code === "UNAUTHORIZED") {
                    const returnUrl = pathname ?? "/scholarships";
                    router.push(`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`);
                    return;
                }

                toast.error(result.error.message || "Could not update bookmark.");
                return;
            }

            setBookmarked(result.data.bookmarked);
        });
    }, [bookmarked, pathname, router, scholarshipId]);

    const label = bookmarked ? "Remove bookmark" : "Bookmark scholarship";

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={bookmarked}
            title={label}
            disabled={pending}
            onClick={onClick}
            className={cn("text-muted-foreground hover:text-foreground", className)}
        >
            <Bookmark
                aria-hidden="true"
                className={cn(
                    "size-4 transition-colors",
                    bookmarked && "fill-current text-primary",
                )}
            />
        </Button>
    );
}
