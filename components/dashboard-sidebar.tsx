"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LucideIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  icon: LucideIcon;
  url: string;
}

export interface SidebarUser {
  name: string;
  role: string;
  avatar?: string;
  initials: string;
}

interface DashboardSidebarProps {
  items: NavItem[];
  user: SidebarUser;
  homeUrl?: string;
}

export function DashboardSidebar({ items, user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/signin");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem className="px-2">
            <div className="min-h-12 mx-auto flex items-center justify-start group px-2">
              <Link href="/">
                {/* Icon logo shown when collapsed */}
                <div className="hidden group-data-[collapsible=icon]:block aspect-square w-6 h-6 relative mx-auto">
                  <Image
                    src="/logo-icon.png"
                    alt="HomeX"
                    fill
                    className="object-contain"
                    sizes="24px"
                    priority
                  />
                </div>
                {/* Full logo shown when expanded */}
                <div className="group-data-[collapsible=icon]:hidden flex items-center h-6 relative w-24 min-w-0">
                  <Image
                    src="/logo-full.png"
                    alt="HomeX CRM"
                    fill
                    className="object-contain"
                    sizes="128px"
                    priority
                  />
                </div>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* User */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Logout"
              disabled={isLoggingOut}
            >
              <button onClick={handleSignOut} disabled={isLoggingOut}>
                <LogOut />
                <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
