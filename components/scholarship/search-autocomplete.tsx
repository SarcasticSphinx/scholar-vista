"use client";

/**
 * Search box with live autocomplete suggestions.
 *
 * Used by the home hero and the public scholarships browse page. As the
 * user types (debounced 250ms) it queries `GET /api/scholarships/suggest`
 * and renders a combobox dropdown of scholarship + university matches.
 *
 * Behavior:
 *   - A leading "Search all scholarships for …" option always submits a
 *     full-text search to `action` (default `/scholarships?q=`).
 *   - Selecting a scholarship navigates to `/scholarships/:id`; selecting a
 *     university navigates to `/universities/:id`.
 *   - `filterInPlace` (used on the browse page) also mirrors the query into
 *     the current URL's `?q=` as the user types, so the results grid filters
 *     live while the dropdown offers quick jumps to a specific record.
 *   - Full keyboard support (Up/Down/Enter/Escape) and ARIA 1.2 combobox
 *     semantics; closes on outside click or blur.
 *
 * Accessibility: implements the ARIA combobox-with-listbox pattern
 * (`role="combobox"` + `aria-expanded` + `aria-activedescendant`, listbox of
 * `role="option"` rows). The live region announces the match count.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Building2, GraduationCap, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchSuggestion } from "@/lib/queries/scholarship";

export interface SearchAutocompleteProps {
    /** Initial query value (e.g. the browse page's current `?q=`). */
    initialQuery?: string;
    /** Path a full-text search submits to. Defaults to `/scholarships`. */
    action?: string;
    /** Also mirror the query into the current URL's `?q=` while typing. */
    filterInPlace?: boolean;
    /** Placeholder text for the input. */
    placeholder?: string;
    /** Class for the wrapping element. */
    className?: string;
    /** Extra classes for the input itself (e.g. taller hero variant). */
    inputClassName?: string;
}

/** Discriminated option model: the "search all" row plus DB suggestions. */
type Option =
    | { kind: "search"; label: string }
    | { kind: "suggestion"; suggestion: SearchSuggestion };

const MIN_CHARS = 2;
const LISTBOX_ID = "search-suggestions";

export function SearchAutocomplete({
    initialQuery = "",
    action = "/scholarships",
    filterInPlace = false,
    placeholder = "Search scholarships or universities…",
    className,
    inputClassName,
}: SearchAutocompleteProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = React.useState(initialQuery);
    const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const abortRef = React.useRef<AbortController | null>(null);

    // Keep the input in sync when the URL query changes externally (e.g. the
    // user clicks a paginator link). Setting to the same value is a no-op.
    React.useEffect(() => {
        setValue(initialQuery);
    }, [initialQuery]);

    const trimmed = value.trim();

    // Build the flat option list the keyboard + render logic iterate over.
    const options = React.useMemo<Option[]>(() => {
        if (trimmed.length < MIN_CHARS) return [];
        return [
            { kind: "search", label: trimmed },
            ...suggestions.map((suggestion) => ({
                kind: "suggestion" as const,
                suggestion,
            })),
        ];
    }, [suggestions, trimmed]);

    /** Write the query into the current page URL (browse-page live filter). */
    const writeQueryToUrl = React.useCallback(
        (next: string) => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            const q = next.trim();
            if (q) params.set("q", q);
            else params.delete("q");
            params.delete("page");
            const target = pathname ?? action;
            const qs = params.toString();
            router.replace(qs ? `${target}?${qs}` : target, { scroll: false });
        },
        [action, pathname, router, searchParams],
    );

    /** Fetch suggestions for the current query, cancelling any in-flight call. */
    const fetchSuggestions = React.useCallback(async (q: string) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
            const res = await fetch(
                `/api/scholarships/suggest?q=${encodeURIComponent(q)}`,
                { signal: controller.signal, headers: { Accept: "application/json" } },
            );
            if (!res.ok) throw new Error(`Suggest request failed: ${res.status}`);
            const data = (await res.json()) as { suggestions?: SearchSuggestion[] };
            setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            setOpen(true);
        } catch (error) {
            // Ignore aborts; surface nothing to the user for transient failures.
            if ((error as Error).name !== "AbortError") {
                setSuggestions([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedFetch = useDebouncedCallback(fetchSuggestions, 250);
    const debouncedUrl = useDebouncedCallback(writeQueryToUrl, 300);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        setValue(next);
        setActiveIndex(-1);
        const q = next.trim();
        if (q.length >= MIN_CHARS) {
            debouncedFetch(q);
        } else {
            debouncedFetch.cancel();
            abortRef.current?.abort();
            setSuggestions([]);
            setOpen(false);
        }
        if (filterInPlace) debouncedUrl(next);
    };

    /** Navigate to a full-text search results page for the current query. */
    const submitSearch = React.useCallback(
        (q: string) => {
            const query = q.trim();
            setOpen(false);
            debouncedUrl.cancel();
            if (filterInPlace) {
                writeQueryToUrl(query);
            } else {
                const target = query
                    ? `${action}?q=${encodeURIComponent(query)}`
                    : action;
                router.push(target);
            }
        },
        [action, debouncedUrl, filterInPlace, router, writeQueryToUrl],
    );

    /** Resolve a chosen option: jump to a detail page or run a full search. */
    const selectOption = React.useCallback(
        (option: Option) => {
            if (option.kind === "search") {
                submitSearch(value);
                return;
            }
            const { suggestion } = option;
            setOpen(false);
            const href =
                suggestion.type === "scholarship"
                    ? `/scholarships/${suggestion.id}`
                    : `/universities/${suggestion.id}`;
            router.push(href);
        },
        [router, submitSearch, value],
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open && options.length > 0) setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (open && activeIndex >= 0 && options[activeIndex]) {
                selectOption(options[activeIndex]);
            } else {
                submitSearch(value);
            }
        } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
        }
    };

    const handleClear = () => {
        debouncedFetch.cancel();
        abortRef.current?.abort();
        setValue("");
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
        if (filterInPlace) writeQueryToUrl("");
        inputRef.current?.focus();
    };

    // Close the dropdown when focus/click moves outside the component.
    React.useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
                setActiveIndex(-1);
            }
        }
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

    const showDropdown = open && options.length > 0;
    const activeId =
        activeIndex >= 0 ? `${LISTBOX_ID}-opt-${activeIndex}` : undefined;

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <form
                role="search"
                aria-label="Search scholarships and universities"
                onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch(value);
                }}
            >
                <div className="relative">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        ref={inputRef}
                        type="text"
                        name="q"
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (options.length > 0) setOpen(true);
                        }}
                        placeholder={placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        role="combobox"
                        aria-expanded={showDropdown}
                        aria-controls={LISTBOX_ID}
                        aria-autocomplete="list"
                        aria-activedescendant={activeId}
                        aria-label="Search scholarships or universities"
                        className={cn("pl-9 pr-9", inputClassName)}
                    />

                    {loading ? (
                        <Loader2
                            aria-hidden="true"
                            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                        />
                    ) : value ? (
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

            {showDropdown ? (
                <ul
                    id={LISTBOX_ID}
                    role="listbox"
                    aria-label="Search suggestions"
                    className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
                >
                    {options.map((option, index) => {
                        const optionId = `${LISTBOX_ID}-opt-${index}`;
                        const isActive = index === activeIndex;

                        if (option.kind === "search") {
                            return (
                                <li
                                    key="search-all"
                                    id={optionId}
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => selectOption(option)}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                                        isActive ? "bg-accent text-accent-foreground" : "",
                                    )}
                                >
                                    <Search aria-hidden="true" className="size-4 text-brand" />
                                    <span className="truncate">
                                        Search all scholarships for{" "}
                                        <span className="font-semibold">
                                            &ldquo;{option.label}&rdquo;
                                        </span>
                                    </span>
                                </li>
                            );
                        }

                        const { suggestion } = option;
                        const Icon =
                            suggestion.type === "scholarship" ? GraduationCap : Building2;
                        const href =
                            suggestion.type === "scholarship"
                                ? `/scholarships/${suggestion.id}`
                                : `/universities/${suggestion.id}`;

                        return (
                            <li
                                key={`${suggestion.type}-${suggestion.id}`}
                                id={optionId}
                                role="option"
                                aria-selected={isActive}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectOption(option)}
                                className={cn(
                                    "rounded-lg",
                                    isActive ? "bg-accent text-accent-foreground" : "",
                                )}
                            >
                                <Link
                                    href={href}
                                    tabIndex={-1}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-8 flex-none items-center justify-center rounded-lg bg-brand/10 text-brand"
                                    >
                                        <Icon className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">
                                            {suggestion.title}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {suggestion.type === "scholarship"
                                                ? suggestion.subtitle
                                                : `University · ${suggestion.subtitle}`}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            <span role="status" aria-live="polite" className="sr-only">
                {showDropdown
                    ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available`
                    : ""}
            </span>
        </div>
    );
}
