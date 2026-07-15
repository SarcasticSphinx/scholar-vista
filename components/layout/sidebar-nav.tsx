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
import {
    type LucideIcon,
    LayoutDashboard,
    GraduationCap,
    Building2,
    Users,
    FileText,
    CheckSquare,
    BarChart3,
    Settings,
    HelpCircle,
} from "lucide-react";

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

/**
 * Source-of-truth dashboard navigation configuration.
 *
 * This lives inside the client island (not the server `Sidebar`) because
 * the `icon` values are React component references (functions), which
 * cannot be serialized across the server → client boundary as props.
 * Keeping the config here ensures the icon components never cross that
 * boundary.
 */
const DASHBOARD_NAV: DashboardNavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Scholarships", url: "/dashboard/scholarships", icon: GraduationCap },
    { title: "Universities", url: "/dashboard/universities", icon: Building2 },
    { title: "Users", url: "/dashboard/users", icon: Users },
    { title: "Applications", url: "/dashboard/applications", icon: FileText },
    { title: "Approvals", url: "/dashboard/approvals", icon: CheckSquare },
    { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
    { title: "Help", url: "/dashboard/help", icon: HelpCircle },
];

export function SidebarNav() {
    const pathname = usePathname();
    const items = DASHBOARD_NAV;

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
