import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
    /** Current active page (1-indexed) */
    currentPage: number;
    /** Total number of pages */
    totalPages: number;
    /** Base URL path for pagination links (e.g., "/admin/team") */
    basePath: string;
    /** Additional query parameters to preserve in pagination links */
    searchParams?: Record<string, string | undefined>;
    /** Number of page buttons to show (default: 5) */
    maxVisiblePages?: number;
    /** Show first/last page jump buttons (default: false) */
    showFirstLast?: boolean;
    /** Additional CSS classes for the container */
    className?: string;
}

/**
 * Server-side pagination component that generates URL-based navigation links.
 * Works with Next.js App Router and preserves search parameters across page changes.
 * 
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   basePath="/admin/team"
 *   searchParams={{ search: "john", status: "active" }}
 * />
 * ```
 */
export function Pagination({
    currentPage,
    totalPages,
    basePath,
    searchParams = {},
    maxVisiblePages = 5,
    showFirstLast = false,
    className,
}: PaginationProps) {
    // Don't render if there's only one page or less
    if (totalPages <= 1) return null;

    /**
     * Creates a URL for a specific page, preserving existing search params
     */
    const createPageUrl = (page: number): string => {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        
        // Preserve additional search params
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== "") {
                params.set(key, value);
            }
        });
        
        return `${basePath}?${params.toString()}`;
    };

    /**
     * Generates the array of page numbers/ellipses to display
     */
    const getPageNumbers = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
        const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
        
        // If total pages fit within maxVisiblePages, show all
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        }

        const halfVisible = Math.floor(maxVisiblePages / 2);
        
        // Near the beginning
        if (currentPage <= halfVisible + 1) {
            for (let i = 1; i <= maxVisiblePages - 1; i++) {
                pages.push(i);
            }
            pages.push("ellipsis-end");
            pages.push(totalPages);
        }
        // Near the end
        else if (currentPage >= totalPages - halfVisible) {
            pages.push(1);
            pages.push("ellipsis-start");
            for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
                pages.push(i);
            }
        }
        // In the middle
        else {
            pages.push(1);
            pages.push("ellipsis-start");
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                pages.push(i);
            }
            pages.push("ellipsis-end");
            pages.push(totalPages);
        }
        
        return pages;
    };

    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    return (
        <nav 
            role="navigation" 
            aria-label="Pagination"
            className={cn("flex items-center justify-center gap-1", className)}
        >
            {/* First page button */}
            {showFirstLast && (
                <PaginationButton
                    href={createPageUrl(1)}
                    disabled={isFirstPage}
                    aria-label="Go to first page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </PaginationButton>
            )}

            {/* Previous page button */}
            <PaginationButton
                href={createPageUrl(currentPage - 1)}
                disabled={isFirstPage}
                aria-label="Go to previous page"
            >
                <ChevronLeft className="h-4 w-4" />
            </PaginationButton>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
                {getPageNumbers().map((page) => {
                    if (typeof page === "string") {
                        return (
                            <span 
                                key={page} 
                                className="px-2 text-muted-foreground select-none"
                                aria-hidden="true"
                            >
                                …
                            </span>
                        );
                    }

                    const isCurrentPage = currentPage === page;

                    return (
                        <PaginationButton
                            key={page}
                            href={createPageUrl(page)}
                            isActive={isCurrentPage}
                            aria-label={`Page ${page}`}
                            aria-current={isCurrentPage ? "page" : undefined}
                        >
                            {page}
                        </PaginationButton>
                    );
                })}
            </div>

            {/* Next page button */}
            <PaginationButton
                href={createPageUrl(currentPage + 1)}
                disabled={isLastPage}
                aria-label="Go to next page"
            >
                <ChevronRight className="h-4 w-4" />
            </PaginationButton>

            {/* Last page button */}
            {showFirstLast && (
                <PaginationButton
                    href={createPageUrl(totalPages)}
                    disabled={isLastPage}
                    aria-label="Go to last page"
                >
                    <ChevronsRight className="h-4 w-4" />
                </PaginationButton>
            )}
        </nav>
    );
}

interface PaginationButtonProps {
    href: string;
    disabled?: boolean;
    isActive?: boolean;
    children: React.ReactNode;
    "aria-label"?: string;
    "aria-current"?: "page" | undefined;
}

function PaginationButton({
    href,
    disabled = false,
    isActive = false,
    children,
    ...props
}: PaginationButtonProps) {
    if (disabled) {
        return (
            <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled
                {...props}
            >
                {children}
            </Button>
        );
    }

    if (isActive) {
        return (
            <Button
                variant="default"
                size="icon"
                className="h-9 w-9"
                {...props}
            >
                {children}
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            asChild
            {...props}
        >
            <Link href={href}>{children}</Link>
        </Button>
    );
}

/**
 * Displays pagination info text (e.g., "Showing 1-10 of 100 results")
 */
export interface PaginationInfoProps {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    className?: string;
    /** Custom label for items (default: "results") */
    itemLabel?: string;
}

export function PaginationInfo({
    currentPage,
    pageSize,
    totalItems,
    className,
    itemLabel = "results",
}: PaginationInfoProps) {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    if (totalItems === 0) {
        return (
            <p className={cn("text-sm text-muted-foreground", className)}>
                No {itemLabel} found
            </p>
        );
    }

    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalItems}</span> {itemLabel}
        </p>
    );
}

/**
 * Container component for pagination with info text
 */
export interface PaginationContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function PaginationContainer({ children, className }: PaginationContainerProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 mt-6", className)}>
            {children}
        </div>
    );
}
