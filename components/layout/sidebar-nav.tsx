"use client";

/**
 * Sidebar navigation list (client island).
 *
 * Renders the active-link state for the dashboard sidebar. The parent
 * `Sidebar` component is a server component that owns the static markup
 * and the source-of-truth nav configuration; this client island is only
 * responsible for highlighting the link that matches the current
 * `usePathname()` value.
 *
 * Validates: Requirements 23.5
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

export type DashboardNavItem = {
    title: string;
    url: string;
    icon: LucideIcon;
};

interface SidebarNavProps {
    items: DashboardNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
    const pathname = usePathname();

    return (
        <SidebarMenu>
            {items.map((item) => {
                const isActive =
                    pathname === item.url ||
                    (item.url !== "/dashboard" &&
                        pathname.startsWith(item.url + "/"));
                return (
                    <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            isActive={isActive}
                        >
                            <Link
                                href={item.url}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <item.icon aria-hidden />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    );
}
