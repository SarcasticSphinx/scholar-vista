"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, SidebarUser } from "@/components/dashboard-sidebar";
import { Header } from "@/components/header";
import { adminNavItems, operatorNavItems } from "@/config/navigation";

interface DashboardLayoutClientProps {
    children: React.ReactNode;
    user: {
        name: string;
        role: string;
        image?: string | null;
    };
}

export function DashboardLayoutClient({
    children,
    user,
}: DashboardLayoutClientProps) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith("/admin");

    const items = isAdmin ? adminNavItems : operatorNavItems;
    const homeUrl = isAdmin ? "/admin" : "/operator";
    const title = isAdmin ? "Admin Dashboard" : "Operator Dashboard";

    // Create user object for sidebar
    const sidebarUser: SidebarUser = {
        name: user.name,
        role: user.role === "ADMIN" ? "Administrator" : "Operator",
        avatar: user.image || undefined,
        initials: user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase(),
    };

    return (
        <SidebarProvider>
            <DashboardSidebar items={items} user={sidebarUser} homeUrl={homeUrl} />
            <Header title={title} />
            <main className="flex-1 overflow-auto pt-16">{children}</main>
        </SidebarProvider>
    );
}
