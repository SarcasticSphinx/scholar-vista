"use client";

/**
 * Client search input for the admin users list (`/dashboard/users`).
 *
 * Mirrors the `?q=` URL parameter and pushes changes via
 * `router.replace(...)` so the server page re-queries with the new
 * name/email filter (Req 19.1). Debounced by 300ms; pressing Enter
 * applies immediately. Changing the search always resets `?page=` so the
 * user lands back on page 1.
 *
 * Validates: Requirement 19.1.
 */

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface UserSearchProps {
    /** Current value of the `q` URL parameter, used as the initial value. */
    initialQuery: string;
    /** Optional className for the wrapping form element. */
    className?: string;
}

export function UserSearch({ initialQuery, className }: UserSearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = React.useState(initialQuery);

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
            params.delete("page");
            const query = params.toString();
            const target = pathname ?? "/dashboard/users";
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
            aria-label="Search users"
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
                    placeholder="Search by name or email"
                    aria-label="Search users by name or email"
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
