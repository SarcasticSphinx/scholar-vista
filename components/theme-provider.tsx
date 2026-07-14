"use client";

/**
 * Client wrapper around `next-themes` `ThemeProvider`.
 *
 * `next-themes` ships a client-only provider that toggles a class on
 * `<html>` based on the active theme. Wrapping it in a dedicated client
 * component keeps `app/layout.tsx` a Server Component and gives the rest
 * of the app a single import surface for theming.
 *
 * Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
