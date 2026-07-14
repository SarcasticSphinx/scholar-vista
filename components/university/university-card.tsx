/**
 * Server-rendered university card.
 *
 * Used by the universities listing page (Req 13.1, 13.2, 13.3) and the
 * partner-universities rail on the home page (Req 4.5). The card itself
 * stays on the server; clicking the card navigates to the university
 * detail page via a single `<Link>` wrapper so the entire surface is
 * keyboard- and screen-reader-friendly without needing a client island.
 *
 * Required content (Req 13.2):
 *   - logo (rendered via `next/image` per Req 25.4)
 *   - name
 *   - country
 *   - world rank
 *   - type (PUBLIC/PRIVATE)
 *
 * Validates: Requirements 13.2, 13.3, 14.1, 25.4.
 */

import Image from "next/image";
import Link from "next/link";
import { Globe2, Star, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UniversityCardDTO } from "@/lib/queries/dto";

export interface UniversityCardProps {
    /** Compact university row from `lib/queries/university.ts`. */
    university: UniversityCardDTO;
    /** Optional className override for grid layout. */
    className?: string;
    /** When the card lives above the fold, opt the logo into Next priority. */
    priority?: boolean;
}

/** Render `PUBLIC` / `PRIVATE` enums as `"Public"` / `"Private"`. */
function typeLabel(type: UniversityCardDTO["type"]): string {
    return type
        .toString()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Render a single university summary card. Pure server component — the
 * full card is wrapped in a `Link` so navigation (Req 13.3) does not
 * require any client JS.
 */
export function UniversityCard({
    university,
    className,
    priority = false,
}: UniversityCardProps) {
    const detailHref = `/universities/${university.id}`;
    const altText = `${university.name} logo`;

    return (
        <Card
            className={cn(
                "group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md focus-within:shadow-md",
                className,
            )}
            data-slot="university-card"
            data-university-id={university.id}
        >
            <Link
                href={detailHref}
                className="flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                aria-label={`View ${university.name} details`}
            >
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                    {university.logo ? (
                        <Image
                            src={university.logo}
                            alt={altText}
                            width={48}
                            height={48}
                            className="size-12 rounded-md bg-background object-contain ring-1 ring-border"
                            priority={priority}
                            loading={priority ? undefined : "lazy"}
                            sizes="48px"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex size-12 items-center justify-center rounded-md bg-muted text-base font-semibold uppercase text-muted-foreground ring-1 ring-border"
                        >
                            {university.name.charAt(0)}
                        </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight transition-colors group-hover:text-brand">
                            {university.name}
                        </h3>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe2 aria-hidden="true" className="size-3.5 shrink-0" />
                            <span className="truncate">
                                {university.city}, {university.country}
                            </span>
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-wrap items-center gap-2 p-4 pt-0">
                    <Badge
                        variant="secondary"
                        className="gap-1"
                        aria-label={`World rank ${university.worldRank}`}
                    >
                        <Trophy aria-hidden="true" className="size-3" />
                        <span>Rank #{university.worldRank}</span>
                    </Badge>
                    <Badge variant="outline" aria-label={`${typeLabel(university.type)} institution`}>
                        {typeLabel(university.type)}
                    </Badge>
                    {university.isPartner ? (
                        <Badge
                            variant="default"
                            className="gap-1"
                            aria-label="Partner university"
                        >
                            <Star aria-hidden="true" className="size-3" />
                            <span>Partner</span>
                        </Badge>
                    ) : null}
                </CardContent>

                <CardFooter className="mt-auto border-t p-4 pt-3 text-xs text-muted-foreground">
                    View details
                    <span aria-hidden="true" className="ml-1">
                        →
                    </span>
                </CardFooter>
            </Link>
        </Card>
    );
}
