"use client";

/**
 * Dashboard topbar (client island).
 *
 * Sits inside the `(dashboard)` layout's `SidebarProvider`. Renders a
 * sticky header with the sidebar trigger (so the rail can be collapsed
 * or expanded), the page heading slot, and the theme toggle. The trigger
 * is a client-only consumer of `SidebarContext`, which is why this
 * component is itself a client component.
 *
 * Validates: Requirements 22.1, 23.5
 */

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface DashboardTopbarProps {
    title?: string;
}

export function DashboardTopbar({
    title = "Dashboard",
}: DashboardTopbarProps) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger
                aria-label="Toggle sidebar"
                className="bg-muted text-foreground rounded-md"
            />
            <h1 className="text-base font-semibold">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
            </div>
        </header>
    );
}
