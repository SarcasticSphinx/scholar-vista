/**
 * Server-rendered scholarship card.
 *
 * Used by the home page featured rail (Req 4.3) and the browse listing
 * (Req 5.1, 5.9). The card itself stays on the server so the catalog avoids
 * shipping JS for static markup; only the bookmark and compare buttons are
 * client islands.
 *
 * Layout:
 *   ┌─ image / category badge / bookmark+compare ─┐
 *   │ title (link)                                │
 *   │ university logo + name                      │
 *   │ deadline · location                         │
 *   │ footer: stipend                             │
 *
 * Formatting:
 *   - `deadline` rendered via `formatDate` (Intl).
 *   - `stipend` rendered via `formatCurrency` (Intl) so locale + currency
 *     symbol stay consistent with the rest of the app (Req 32.x).
 *
 * Validates: Requirements 4.6, 5.9, 25.2 (Image, RSC, skeletons).
 */

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/intl";
import { cn } from "@/lib/utils";
import type { ScholarshipCardDTO } from "@/lib/queries/scholarship";

import { BookmarkButton } from "./bookmark-button";
import { CompareButton } from "./compare-button";

export interface ScholarshipCardProps {
    /** Compact scholarship row from `lib/queries/scholarship`. */
    scholarship: ScholarshipCardDTO;
    /** Whether the current user has bookmarked this scholarship. */
    isBookmarked?: boolean;
    /** Optional className override for grid layout. */
    className?: string;
    /** When the card lives above the fold, opt the logo into Next priority. */
    priority?: boolean;
}

/** Convert the database enum to a human-friendly label without `_`. */
function categoryLabel(category: ScholarshipCardDTO["category"]): string {
    return category
        .toString()
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse `Decimal -> string` stipend back to a number for currency formatting. */
function stipendToNumber(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Render a single scholarship summary card. Pure server component — any
 * interactivity (bookmark, compare) is delegated to client islands.
 */
export function ScholarshipCard({
    scholarship,
    isBookmarked = false,
    className,
    priority = false,
}: ScholarshipCardProps) {
    const detailHref = `/scholarships/${scholarship.id}`;
    const stipendNumber = stipendToNumber(scholarship.stipend);
    const formattedDeadline = formatDate(scholarship.deadline, undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const formattedStipend =
        stipendNumber > 0 ? formatCurrency(stipendNumber) : "Amount varies";

    return (
        <Card
            className={cn(
                "group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md",
                className,
            )}
            data-slot="scholarship-card"
            data-scholarship-id={scholarship.id}
        >
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
                <Badge variant="secondary" className="capitalize">
                    {categoryLabel(scholarship.category)}
                </Badge>
                <div className="flex items-center gap-1">
                    <BookmarkButton
                        scholarshipId={scholarship.id}
                        initial={isBookmarked}
                    />
                    <CompareButton
                        scholarship={{
                            id: scholarship.id,
                            title: scholarship.title,
                            universityName: scholarship.university.name,
                        }}
                    />
                </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
                <Link
                    href={detailHref}
                    className="text-base font-semibold leading-snug tracking-tight outline-none transition-colors hover:text-brand focus-visible:text-brand line-clamp-2"
                >
                    {scholarship.title}
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {scholarship.university.logo ? (
                        <Image
                            src={scholarship.university.logo}
                            alt={`${scholarship.university.name} logo`}
                            width={24}
                            height={24}
                            className="size-6 rounded-sm object-contain"
                            priority={priority}
                            loading={priority ? undefined : "lazy"}
                            sizes="24px"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex size-6 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold uppercase text-muted-foreground"
                        >
                            {scholarship.university.name.charAt(0)}
                        </span>
                    )}
                    <span className="truncate">{scholarship.university.name}</span>
                </div>

                <dl className="mt-auto grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
                        <dt className="sr-only">Deadline</dt>
                        <dd>
                            <time dateTime={scholarship.deadline}>{formattedDeadline}</time>
                        </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="size-4 shrink-0" />
                        <dt className="sr-only">Location</dt>
                        <dd className="truncate">{scholarship.location}</dd>
                    </div>
                </dl>
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-2 border-t p-4 pt-3">
                <div className="text-xs text-muted-foreground">Stipend</div>
                <div className="text-sm font-semibold text-foreground">
                    {formattedStipend}
                </div>
            </CardFooter>
        </Card>
    );
}
