"use client";

/**
 * Scholarship comparison page.
 *
 * Hydrates the cart from `localStorage` via {@link useComparison} and, once
 * hydration completes, fetches the matching scholarships through the
 * `getCompareScholarships` Server Action. The page renders a side-by-side
 * table with a row for each comparison attribute (title, university,
 * stipend, coverage, deadline, category, requirements, rating) and a
 * column per scholarship. Missing values render as the literal `"-"`
 * (Req 15.6, 15.7).
 *
 * Empty / under-minimum state:
 *   When fewer than {@link MIN_COMPARE} items are in the cart the page
 *   shows an `EmptyState` with a CTA back to `/scholarships` so the user
 *   knows how to populate the cart.
 *
 * Note: this is a Client Component because the cart lives in
 * `localStorage`. The data fetch runs through a Server Action so the
 * Prisma layer (and the `isApproved` gate) stays on the server.
 *
 * Validates: Requirements 15.6, 15.7
 */

import * as React from "react";
import Link from "next/link";
import { Scale } from "lucide-react";

import { getCompareScholarships } from "@/actions/scholarship";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
    MIN_COMPARE,
    useComparison,
    type ComparisonItem,
} from "@/hooks/use-comparison";
import { formatCurrency, formatDate } from "@/lib/intl";
import type { ScholarshipDetailDTO } from "@/lib/queries/scholarship";

/** Placeholder rendered for any null/undefined/empty attribute (Req 15.7). */
const MISSING = "-";

/** Rows displayed in the comparison table, in render order. */
const ATTRIBUTE_ROWS = [
    "title",
    "university",
    "stipend",
    "coverage",
    "deadline",
    "category",
    "requirements",
    "rating",
] as const;

type AttributeKey = (typeof ATTRIBUTE_ROWS)[number];

const ROW_LABELS: Record<AttributeKey, string> = {
    title: "Title",
    university: "University",
    stipend: "Stipend",
    coverage: "Coverage",
    deadline: "Deadline",
    category: "Category",
    requirements: "Requirements",
    rating: "Rating",
};

/**
 * Convert a raw value to its display string, returning {@link MISSING} for
 * `null`, `undefined`, or empty strings. Anything else is coerced to a
 * string by the caller before being passed in.
 */
function displayOrDash(value: string | null | undefined): string {
    if (value === null || value === undefined) return MISSING;
    const trimmed = value.trim();
    return trimmed.length === 0 ? MISSING : trimmed;
}

/**
 * Format a Prisma `Decimal`-as-string stipend for display. Falls back to
 * the raw string when parsing fails so we never silently drop data.
 */
function formatStipend(value: string | null | undefined): string {
    if (value === null || value === undefined || value.length === 0) {
        return MISSING;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    return formatCurrency(parsed);
}

/**
 * Format the average rating to one decimal place, returning {@link MISSING}
 * when the scholarship has no reviews.
 */
function formatRating(value: number | null | undefined): string {
    if (value === null || value === undefined) return MISSING;
    if (!Number.isFinite(value)) return MISSING;
    return `${value.toFixed(1)} / 5`;
}

/**
 * Resolve the cell value for a given (attribute, scholarship) pair. The
 * function always returns a string; callers don't have to special-case
 * missing values.
 */
function getCellValue(
    attribute: AttributeKey,
    scholarship: ScholarshipDetailDTO,
): string {
    switch (attribute) {
        case "title":
            return displayOrDash(scholarship.title);
        case "university":
            return displayOrDash(scholarship.university?.name ?? null);
        case "stipend":
            return formatStipend(scholarship.stipend);
        case "coverage":
            return displayOrDash(scholarship.coverage);
        case "deadline":
            return scholarship.deadline
                ? formatDate(scholarship.deadline, undefined, {
                    dateStyle: "medium",
                })
                : MISSING;
        case "category":
            return displayOrDash(scholarship.category);
        case "requirements":
            return displayOrDash(scholarship.requirements);
        case "rating":
            return formatRating(scholarship.averageRating);
    }
}

/** Table skeleton shown while the Server Action resolves. */
function ComparisonTableSkeleton({ columnCount }: { columnCount: number }) {
    return (
        <div className="rounded-lg border" aria-busy="true" aria-hidden="true">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-40">
                            <Skeleton className="h-4 w-24" />
                        </TableHead>
                        {Array.from({ length: columnCount }).map((_, idx) => (
                            <TableHead key={idx}>
                                <Skeleton className="h-4 w-32" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ATTRIBUTE_ROWS.map((attribute) => (
                        <TableRow key={attribute}>
                            <TableCell className="font-medium">
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            {Array.from({ length: columnCount }).map((_, idx) => (
                                <TableCell key={idx}>
                                    <Skeleton className="h-4 w-3/4" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * Render the comparison page proper. Split out so the top-level component
 * can early-return for empty / loading states without nesting JSX deeply.
 */
function ComparisonTable({
    cartItems,
    scholarships,
}: {
    cartItems: ComparisonItem[];
    scholarships: ScholarshipDetailDTO[];
}) {
    // The scholarships list may be shorter than the cart when items were
    // deleted or unapproved server-side. Build a lookup so the table can
    // still show `-` for the dropped columns rather than misaligning.
    const byId = new Map<string, ScholarshipDetailDTO>();
    for (const item of scholarships) byId.set(item.id, item);

    // Use cart order as the column order so the visible position matches
    // what the user assembled in the tray.
    const columns = cartItems.map((cart) => ({
        cart,
        scholarship: byId.get(cart.id) ?? null,
    }));

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col" className="w-40">
                            Attribute
                        </TableHead>
                        {columns.map(({ cart, scholarship }) => (
                            <TableHead key={cart.id} scope="col" className="min-w-[14rem]">
                                {scholarship ? (
                                    <Link
                                        href={`/scholarships/${scholarship.id}`}
                                        className="font-semibold hover:underline"
                                    >
                                        {scholarship.title}
                                    </Link>
                                ) : (
                                    <span className="font-semibold">{cart.title}</span>
                                )}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ATTRIBUTE_ROWS.map((attribute) => (
                        <TableRow key={attribute}>
                            <TableCell
                                scope="row"
                                className="font-medium text-muted-foreground"
                            >
                                {ROW_LABELS[attribute]}
                            </TableCell>
                            {columns.map(({ cart, scholarship }) => {
                                const value = scholarship
                                    ? getCellValue(attribute, scholarship)
                                    : MISSING;
                                return (
                                    <TableCell
                                        key={`${attribute}-${cart.id}`}
                                        className="whitespace-pre-wrap align-top"
                                    >
                                        {value}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function ComparePage() {
    const { items, count } = useComparison();

    // Track hydration explicitly so the "fewer than 2 items" empty state
    // doesn't flash on first paint while the cart is still being read
    // from localStorage.
    const [hydrated, setHydrated] = React.useState(false);
    React.useEffect(() => {
        setHydrated(true);
    }, []);

    const [scholarships, setScholarships] = React.useState<ScholarshipDetailDTO[]>(
        [],
    );
    const [loading, setLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    // Fetch scholarship data whenever the set of cart ids changes. Using
    // a JSON join keeps the dependency a primitive and avoids re-fetching
    // when the array reference is replaced but contents are equal.
    const idsKey = items.map((it) => it.id).join("|");

    React.useEffect(() => {
        if (!hydrated) return;
        if (count < MIN_COMPARE) {
            setScholarships([]);
            setErrorMessage(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setErrorMessage(null);

        getCompareScholarships(items.map((it) => it.id))
            .then((result) => {
                if (cancelled) return;
                if (result.ok) {
                    setScholarships(result.data);
                } else {
                    setScholarships([]);
                    setErrorMessage(result.error.message);
                }
            })
            .catch(() => {
                if (cancelled) return;
                setScholarships([]);
                setErrorMessage("Failed to load comparison data.");
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // `items` reference can change on every render; depend on the joined
        // id key instead so we only refetch when the cart actually changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, count, idsKey]);

    return (
        <section
            aria-labelledby="compare-heading"
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            <header className="mb-6 space-y-1">
                <h1
                    id="compare-heading"
                    className="text-3xl font-semibold tracking-tight"
                >
                    Compare scholarships
                </h1>
                <p className="text-sm text-muted-foreground">
                    Review the differences across your selected scholarships
                    side-by-side. Add 2 to 3 scholarships from the catalog to begin.
                </p>
            </header>

            {!hydrated ? (
                <ComparisonTableSkeleton columnCount={2} />
            ) : count < MIN_COMPARE ? (
                <EmptyState
                    icon={Scale}
                    title="Add scholarships to compare"
                    description={`Select at least ${MIN_COMPARE} scholarships from the catalog to compare them side by side.`}
                    action={{ label: "Browse scholarships", href: "/scholarships" }}
                />
            ) : loading ? (
                <ComparisonTableSkeleton columnCount={count} />
            ) : errorMessage ? (
                <EmptyState
                    icon={Scale}
                    title="Couldn't load comparison"
                    description={errorMessage}
                    action={{ label: "Browse scholarships", href: "/scholarships" }}
                />
            ) : (
                <ComparisonTable cartItems={items} scholarships={scholarships} />
            )}
        </section>
    );
}
