"use client";

/**
 * Client pagination control used by listings (browse, universities,
 * applications, etc.). Renders Prev / page numbers / Next.
 *
 * URL behaviour:
 *   - When clicked, the current `URLSearchParams` are read from
 *     `useSearchParams`, the `page` key is rewritten, and the result is
 *     pushed via `router.replace(...)`. This preserves filter/sort params
 *     (Req 5.7) and avoids creating a new history entry per page.
 *   - `baseUrl` is the path the listing lives at (e.g. `/scholarships`).
 *
 * Validates: Requirements 4.6, 5.9, 25.2 (shared list scaffolding).
 */

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
    /** 1-indexed current page. */
    currentPage: number;
    /** Total number of pages (>= 1). */
    totalPages: number;
    /**
     * Path the listing lives at — e.g. `/scholarships`. Defaults to the
     * current pathname when omitted, which is the right behaviour for the
     * built-in URL-state pages.
     */
    baseUrl?: string;
    /** Maximum number of numeric buttons to render (default: 5). */
    maxVisiblePages?: number;
    /** Optional className for the nav element. */
    className?: string;
}

type PageToken = number | "ellipsis-start" | "ellipsis-end";

function buildPageList(
    currentPage: number,
    totalPages: number,
    maxVisible: number,
): PageToken[] {
    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: PageToken[] = [];
    const half = Math.floor(maxVisible / 2);

    if (currentPage <= half + 1) {
        for (let i = 1; i <= maxVisible - 1; i++) pages.push(i);
        pages.push("ellipsis-end");
        pages.push(totalPages);
        return pages;
    }

    if (currentPage >= totalPages - half) {
        pages.push(1);
        pages.push("ellipsis-start");
        for (let i = totalPages - maxVisible + 2; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    }

    pages.push(1);
    pages.push("ellipsis-start");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push("ellipsis-end");
    pages.push(totalPages);
    return pages;
}

/**
 * Render the navigation. Hidden when there is only a single page to keep
 * listings tidy.
 */
export function Pagination({
    currentPage,
    totalPages,
    baseUrl,
    maxVisiblePages = 5,
    className,
}: PaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (totalPages <= 1) return null;

    const targetPath = baseUrl ?? pathname ?? "/";

    const goToPage = React.useCallback(
        (page: number) => {
            if (page < 1 || page > totalPages || page === currentPage) return;

            const params = new URLSearchParams(searchParams?.toString() ?? "");
            if (page === 1) {
                params.delete("page");
            } else {
                params.set("page", String(page));
            }
            const query = params.toString();
            router.replace(query ? `${targetPath}?${query}` : targetPath, {
                scroll: false,
            });
        },
        [currentPage, router, searchParams, targetPath, totalPages],
    );

    const pages = buildPageList(currentPage, totalPages, maxVisiblePages);
    const isFirst = currentPage <= 1;
    const isLast = currentPage >= totalPages;

    return (
        <nav
            role="navigation"
            aria-label="Pagination"
            className={cn("flex items-center justify-center gap-1", className)}
        >
            <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={isFirst}
                onClick={() => goToPage(currentPage - 1)}
                className="h-9 w-9"
            >
                <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-1">
                {pages.map((token) => {
                    if (typeof token === "string") {
                        return (
                            <span
                                key={token}
                                aria-hidden="true"
                                className="select-none px-2 text-muted-foreground"
                            >
                                …
                            </span>
                        );
                    }

                    const isCurrent = token === currentPage;
                    return (
                        <Button
                            key={token}
                            type="button"
                            variant={isCurrent ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9"
                            aria-label={`Go to page ${token}`}
                            aria-current={isCurrent ? "page" : undefined}
                            onClick={() => goToPage(token)}
                        >
                            {token}
                        </Button>
                    );
                })}
            </div>

            <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={isLast}
                onClick={() => goToPage(currentPage + 1)}
                className="h-9 w-9"
            >
                <ChevronRight className="size-4" />
            </Button>
        </nav>
    );
}
