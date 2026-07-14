"use client";

/**
 * Client-side search input for the public universities listing.
 *
 * Behavior:
 *   - Reads the active query (`?q=`) from the current URL on mount and
 *     keeps the input controlled.
 *   - Debounces user input by 300ms and pushes the new query to the URL
 *     via `router.replace(...)` so the server component can re-fetch with
 *     the new filter (Req 13.4, 13.5).
 *   - Clears `?page=` whenever the search changes, restarting pagination
 *     at page 1.
 *   - Pressing Enter applies the search immediately (no debounce wait).
 *
 * Validates: Requirements 13.4, 13.5.
 */

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface UniversitySearchProps {
    /** Current value of the `q` URL parameter, used as the initial value. */
    initialQuery: string;
    /** Optional className for the wrapping form element. */
    className?: string;
}

/**
 * Render a search field that mirrors the URL `?q=` parameter and updates
 * it as the user types. Server pages re-render with the new search.
 */
export function UniversitySearch({
    initialQuery,
    className,
}: UniversitySearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = React.useState(initialQuery);

    // Keep local input value in sync with external URL changes (e.g. when
    // the user clicks a paginator link without re-typing).
    React.useEffect(() => {
        setValue(initialQuery);
    }, [initialQuery]);

    const writeQueryToUrl = React.useCallback(
        (next: string) => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            const trimmed = next.trim();
            if (trimmed) {
                params.set("q", trimmed);
            } else {
                params.delete("q");
            }
            // Always reset pagination on a search change.
            params.delete("page");
            const query = params.toString();
            const target = pathname ?? "/universities";
            router.replace(query ? `${target}?${query}` : target, {
                scroll: false,
            });
        },
        [pathname, router, searchParams],
    );

    const debouncedWrite = useDebouncedCallback(writeQueryToUrl, 300);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        setValue(next);
        debouncedWrite(next);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        debouncedWrite.cancel();
        writeQueryToUrl(value);
    };

    const handleClear = () => {
        debouncedWrite.cancel();
        setValue("");
        writeQueryToUrl("");
    };

    return (
        <form
            role="search"
            aria-label="Search universities"
            onSubmit={handleSubmit}
            className={className}
        >
            <div className="relative">
                <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    type="search"
                    name="q"
                    value={value}
                    onChange={handleChange}
                    placeholder="Search by name or country"
                    aria-label="Search universities by name or country"
                    autoComplete="off"
                    className="pl-9 pr-9"
                />
                {value ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleClear}
                        aria-label="Clear search"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </Button>
                ) : null}
            </div>
        </form>
    );
}
