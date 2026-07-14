"use client";

/**
 * User account dropdown menu.
 *
 * Renders the avatar + name button used in the Navbar's right slot when
 * the visitor is authenticated. The dropdown shows the signed-in user's
 * name and email, links to the user-facing areas (Profile, My
 * Applications, My Bookmarks, My Reviews, Notifications), and exposes
 * the Dashboard link only when the role is ADMIN/MODERATOR. Sign-out
 * calls `authClient.signOut()`, shows a success toast, and redirects to
 * the home page on success (Req 3.8).
 *
 * Validates: Requirements 3.7, 3.8, 22.1, 23.2
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bell,
    Bookmark,
    FileText,
    LayoutDashboard,
    LogOut,
    Star,
    User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

interface UserMenuProps {
    user: {
        name: string;
        email: string;
        image: string | null;
        role: string;
    };
}

function initialsFor(name: string): string {
    if (!name) return "?";
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
    const router = useRouter();
    const [signingOut, setSigningOut] = React.useState(false);

    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

    async function handleSignOut() {
        setSigningOut(true);
        try {
            await authClient.signOut();
            toast.success("Signed out");
            router.push("/");
            router.refresh();
        } catch {
            toast.error("Failed to sign out");
            setSigningOut(false);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label={`Account menu for ${user.name}`}
                >
                    <Avatar className="h-8 w-8">
                        {user.image ? (
                            <AvatarImage src={user.image} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {initialsFor(user.name)}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                            {user.name}
                        </span>
                        {user.email ? (
                            <span className="truncate text-xs text-muted-foreground">
                                {user.email}
                            </span>
                        ) : null}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href="/profile">
                        <UserIcon className="mr-2 h-4 w-4" aria-hidden />
                        Profile
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href="/my-applications">
                        <FileText className="mr-2 h-4 w-4" aria-hidden />
                        My Applications
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href="/my-bookmarks">
                        <Bookmark className="mr-2 h-4 w-4" aria-hidden />
                        My Bookmarks
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href="/my-reviews">
                        <Star className="mr-2 h-4 w-4" aria-hidden />
                        My Reviews
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href="/notifications">
                        <Bell className="mr-2 h-4 w-4" aria-hidden />
                        Notifications
                    </Link>
                </DropdownMenuItem>

                {isStaff ? (
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                            <LayoutDashboard
                                className="mr-2 h-4 w-4"
                                aria-hidden
                            />
                            Dashboard
                        </Link>
                    </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onSelect={(event) => {
                        event.preventDefault();
                        if (!signingOut) void handleSignOut();
                    }}
                    disabled={signingOut}
                >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden />
                    {signingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
