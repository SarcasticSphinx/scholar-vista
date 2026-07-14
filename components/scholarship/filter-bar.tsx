"use client";

/**
 * Client filter bar for the public scholarships browse page.
 *
 * Behaviour:
 *   - Renders four selects: category, country, funding, deadline.
 *   - Each select reads its current value from the URL `searchParams`
 *     and updates the URL via `router.replace(...)` while preserving
 *     all other parameters (search `q`, sort, etc.). This satisfies
 *     Req 5.7 (filters are URL-shareable) and matches the pattern used
 *     by `UniversitySearch` / `Pagination`.
 *   - Every change resets `?page=` so the user lands back on page 1.
 *   - A "Reset filters" link clears the four filter params at once but
 *     leaves `q`, `sort`, and any non-filter params untouched.
 *
 * The bar intentionally does not own the search input or the sort
 * select — those live in the page header next to it so each control
 * stays narrowly responsible.
 *
 * Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.7.
 */

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sentinel used by the underlying Radix Select to mean "no filter". */
const ALL_VALUE = "__all__";

/** Filter param keys this bar owns — used for resetting in one shot. */
const FILTER_KEYS = ["category", "country", "funding", "deadline"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** Category values mirror `ScholarshipCategoryEnum` (lib/validation/scholarship). */
const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "UNDERGRADUATE", label: "Undergraduate" },
    { value: "MASTERS", label: "Masters" },
    { value: "PHD", label: "PhD" },
    { value: "POSTDOC", label: "Postdoc" },
    { value: "EXCHANGE", label: "Exchange" },
    { value: "SHORT_COURSE", label: "Short Course" },
];

/**
 * Funding-type tokens. The query layer matches these case-insensitively
 * against `coverage` / `description`, so the labels are also the search
 * terms (Req 5.5).
 */
const FUNDING_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "Merit", label: "Merit-based" },
    { value: "Need", label: "Need-based" },
    { value: "Full", label: "Fully funded" },
    { value: "Partial", label: "Partially funded" },
];

/** Deadline windows accepted by `ScholarshipFiltersSchema`. */
const DEADLINE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "7", label: "Within 7 days" },
    { value: "30", label: "Within 30 days" },
    { value: "90", label: "Within 90 days" },
];

export interface FilterBarProps {
    /**
     * List of country names to render in the country select. Supplied by
     * the page from a distinct-country DB query so the dropdown only
     * shows countries with at least one university record.
     */
    countries: readonly string[];
    /** Optional className wrapping the bar. */
    className?: string;
}

/**
 * Coerce a possibly-empty string to either the value or `undefined` so
 * Radix's `Select` shows the placeholder in the unselected state.
 */
function valueOrUndefined(value: string | null): string | undefined {
    return value && value.length > 0 ? value : undefined;
}

export function FilterBar({ countries, className }: FilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const params = React.useMemo(
        () => new URLSearchParams(searchParams?.toString() ?? ""),
        [searchParams],
    );

    /**
     * Push a single filter change to the URL while preserving every
     * other param. `value === undefined` removes the key. We always drop
     * `?page=` so changing a filter takes the user back to page 1.
     */
    const setFilter = React.useCallback(
        (key: FilterKey, value: string | undefined) => {
            const next = new URLSearchParams(searchParams?.toString() ?? "");
            if (value && value !== ALL_VALUE) {
                next.set(key, value);
            } else {
                next.delete(key);
            }
            next.delete("page");
            const target = pathname ?? "/scholarships";
            const query = next.toString();
            router.replace(query ? `${target}?${query}` : target, {
                scroll: false,
            });
        },
        [pathname, router, searchParams],
    );

    /** Wipe every filter we own at once, leaving q/sort intact. */
    const resetFilters = React.useCallback(() => {
        const next = new URLSearchParams(searchParams?.toString() ?? "");
        for (const key of FILTER_KEYS) next.delete(key);
        next.delete("page");
        const target = pathname ?? "/scholarships";
        const query = next.toString();
        router.replace(query ? `${target}?${query}` : target, { scroll: false });
    }, [pathname, router, searchParams]);

    const category = valueOrUndefined(params.get("category"));
    const country = valueOrUndefined(params.get("country"));
    const funding = valueOrUndefined(params.get("funding"));
    const deadline = valueOrUndefined(params.get("deadline"));

    const hasAnyFilter = Boolean(category || country || funding || deadline);

    return (
        <div
            role="region"
            aria-label="Scholarship filters"
            className={cn(
                "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end",
                className,
            )}
            data-slot="filter-bar"
        >
            <FilterField label="Category" htmlFor="filter-category">
                <Select
                    value={category ?? ALL_VALUE}
                    onValueChange={(value) =>
                        setFilter("category", value === ALL_VALUE ? undefined : value)
                    }
                >
                    <SelectTrigger
                        id="filter-category"
                        className="w-full"
                        aria-label="Filter by category"
                    >
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_VALUE}>All categories</SelectItem>
                        {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FilterField>

            <FilterField label="Country" htmlFor="filter-country">
                <Select
                    value={country ?? ALL_VALUE}
                    onValueChange={(value) =>
                        setFilter("country", value === ALL_VALUE ? undefined : value)
                    }
                    disabled={countries.length === 0}
                >
                    <SelectTrigger
                        id="filter-country"
                        className="w-full"
                        aria-label="Filter by country"
                    >
                        <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_VALUE}>All countries</SelectItem>
                        {countries.map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FilterField>

            <FilterField label="Funding" htmlFor="filter-funding">
                <Select
                    value={funding ?? ALL_VALUE}
                    onValueChange={(value) =>
                        setFilter("funding", value === ALL_VALUE ? undefined : value)
                    }
                >
                    <SelectTrigger
                        id="filter-funding"
                        className="w-full"
                        aria-label="Filter by funding type"
                    >
                        <SelectValue placeholder="Any funding" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_VALUE}>Any funding</SelectItem>
                        {FUNDING_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FilterField>

            <FilterField label="Deadline" htmlFor="filter-deadline">
                <Select
                    value={deadline ?? ALL_VALUE}
                    onValueChange={(value) =>
                        setFilter("deadline", value === ALL_VALUE ? undefined : value)
                    }
                >
                    <SelectTrigger
                        id="filter-deadline"
                        className="w-full"
                        aria-label="Filter by deadline window"
                    >
                        <SelectValue placeholder="Any deadline" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_VALUE}>Any deadline</SelectItem>
                        {DEADLINE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FilterField>

            {hasAnyFilter ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="self-start sm:self-end"
                >
                    <X aria-hidden="true" className="size-4" />
                    Reset filters
                </Button>
            ) : null}
        </div>
    );
}

/** Small wrapper that pairs a label with the select control. */
function FilterField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
            <label
                htmlFor={htmlFor}
                className="text-xs font-medium text-muted-foreground"
            >
                {label}
            </label>
            {children}
        </div>
    );
}
