"use client";

/**
 * Mobile navigation drawer.
 *
 * The desktop navigation lives directly inside the (server) Navbar. On
 * narrow viewports (<md) the desktop links are hidden and replaced by
 * this hamburger button, which toggles a vertical drawer rendered via
 * the shadcn/ui `Sheet` primitive.
 *
 * The drawer:
 *   - Opens from the right side.
 *   - Lists each nav link as a large tap target (≥44×44 — Req 23.4).
 *   - Closes automatically when a link is selected (so the user lands on
 *     the new route without having to dismiss the sheet first).
 *   - Provides an explicit close control through the Sheet's built-in
 *     close button (Req 23.7).
 *
 * The component is intentionally generic about its links so the same
 * implementation can serve public and authenticated navbars.
 *
 * Validates: Requirements 23.2, 23.7
 */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isNavLinkActive, type NavLink } from "@/components/layout/nav-links";

export type { NavLink };

interface MobileMenuProps {
    links: NavLink[];
    /** Optional render-prop slot rendered above the link list (e.g. user info). */
    header?: React.ReactNode;
    /** Optional render-prop slot rendered below the link list (e.g. sign-in button). */
    footer?: React.ReactNode;
    /** Classes for the trigger button (so the navbar can hide it on `md+`). */
    triggerClassName?: string;
}

export function MobileMenu({
    links,
    header,
    footer,
    triggerClassName,
}: MobileMenuProps) {
    const [open, setOpen] = React.useState(false);
    const pathname = usePathname();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation menu"
                    className={cn("md:hidden", triggerClassName)}
                >
                    <Menu className="h-5 w-5" aria-hidden />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="border-b px-6 py-4 text-left">
                    <SheetTitle>
                        <Image
                            src="/scholar-vista-logo.png"
                            alt="ScholarVista"
                            width={1966}
                            height={694}
                            className="h-7 w-auto"
                        />
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        Site navigation
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col">
                    {header ? (
                        <div className="border-b px-6 py-4">{header}</div>
                    ) : null}

                    <nav
                        aria-label="Mobile primary"
                        className="flex flex-col px-2 py-3"
                    >
                        {links.map((link) => {
                            const isActive = isNavLinkActive(pathname, link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    aria-current={isActive ? "page" : undefined}
                                    // 44px min target for Req 23.4.
                                    className={cn(
                                        "min-h-11 flex items-center rounded-md px-4 py-2 text-base font-medium",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        isActive &&
                                        "bg-accent text-accent-foreground"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {footer ? (
                        <div className="mt-auto border-t px-6 py-4">{footer}</div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
}
