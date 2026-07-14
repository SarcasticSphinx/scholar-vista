"use client";

/**
 * Theme toggle button.
 *
 * Cycles the `next-themes` setting through the three supported preferences
 * — `light` → `dark` → `system` — and back again. The icon updates to
 * reflect the *resolved* theme (Sun for light, Moon for dark) plus a
 * "system" affordance overlay so the user can tell at a glance whether
 * the platform is following the OS preference.
 *
 * Mounting behavior:
 *   - `next-themes` mounts after hydration; rendering theme-derived UI
 *     before mount produces a hydration mismatch warning. We render a
 *     placeholder icon button until `mounted` is `true` to avoid that.
 *
 * Accessibility:
 *   - Uses an explicit `aria-label` plus an `sr-only` text describing the
 *     next state ("Switch to dark theme" etc.) so screen readers announce
 *     what activating the control will do.
 *   - The visible icon is decorative (`aria-hidden`).
 *
 * Validates: Requirements 22.1, 22.2, 22.4
 */

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark" | "system";

const NEXT: Record<ThemeMode, ThemeMode> = {
    light: "dark",
    dark: "system",
    system: "light",
};

const NEXT_LABEL: Record<ThemeMode, string> = {
    light: "Switch to dark theme",
    dark: "Switch to system theme",
    system: "Switch to light theme",
};

export function ThemeToggle() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Pre-mount: render a skeleton button so layout doesn't shift and we
    // don't read `theme` (which is `undefined` on the server pass).
    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                aria-label="Theme toggle"
                disabled
            >
                <Sun className="h-5 w-5" aria-hidden />
            </Button>
        );
    }

    const current = (theme ?? "system") as ThemeMode;
    const next = NEXT[current];

    // Choose the icon to render. For "system" we display a Monitor icon
    // even though the underlying class on <html> is light or dark, so the
    // user can see the system mode is active.
    let Icon = Sun;
    if (current === "system") Icon = Monitor;
    else if (current === "dark") Icon = Moon;
    else if (current === "light") Icon = Sun;
    // Defensive fallback if `resolvedTheme` is the only signal.
    else if (resolvedTheme === "dark") Icon = Moon;

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(next)}
            aria-label={NEXT_LABEL[current]}
            title={NEXT_LABEL[current]}
        >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="sr-only">{NEXT_LABEL[current]}</span>
        </Button>
    );
}
