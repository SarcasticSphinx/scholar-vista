/**
 * Dashboard sidebar.
 *
 * Server component used by the `(dashboard)` route group layout. Renders
 * the dashboard navigation rail using shadcn/ui's `Sidebar` primitives.
 * The static markup (header, footer, link configuration) is server-
 * rendered; the active-link highlighting is delegated to the small
 * `SidebarNav` client island so this component itself stays a server
 * component.
 *
 * Behavior:
 *   - Below `lg` (1024px) the sidebar is collapsed by default per
 *     Req 23.5; this is wired through `SidebarProvider`'s
 *     `defaultOpen={false}` and the existing primitive's responsive
 *     overlay/sheet behavior.
 *   - The brand link doubles as the dashboard home link.
 *
 * Validates: Requirements 23.5
 */

import Image from "next/image";
import Link from "next/link";
import {
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
    Sidebar as ShadSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarNav, type DashboardNavItem } from "@/components/layout/sidebar-nav";

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

export function Sidebar() {
    return (
        <ShadSidebar collapsible="icon" aria-label="Dashboard navigation">
            <SidebarHeader className="border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link
                            href="/dashboard"
                            className="flex h-10 items-center gap-2 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="ScholarVista dashboard home"
                        >
                            <Image
                                src="/scholar-vista-logo.png"
                                alt="ScholarVista"
                                width={1966}
                                height={694}
                                priority
                                className="h-7 w-auto group-data-[collapsible=icon]:hidden"
                            />
                            <Image
                                src="/logo-icon.png"
                                alt="ScholarVista"
                                width={64}
                                height={64}
                                className="hidden size-6 object-contain group-data-[collapsible=icon]:block"
                            />
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarNav items={DASHBOARD_NAV} />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t text-xs text-muted-foreground">
                <span className="px-2 group-data-[collapsible=icon]:hidden">
                    © {new Date().getFullYear()} ScholarVista
                </span>
            </SidebarFooter>
        </ShadSidebar>
    );
}
