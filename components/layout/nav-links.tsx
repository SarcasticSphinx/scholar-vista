"use client";

/**
 * Desktop primary nav links with active-page highlighting.
 *
 * Uses `usePathname()` so the current route is marked visually and via
 * `aria-current="page"`. Home only matches exactly; other routes match
 * themselves and nested paths (e.g. `/scholarships` on detail pages).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavLink = {
    href: string;
    label: string;
};

interface NavLinksProps {
    links: NavLink[];
}

export function isNavLinkActive(pathname: string, href: string): boolean {
    return (
        pathname === href ||
        (href !== "/" && pathname.startsWith(href + "/"))
    );
}

export function NavLinks({ links }: NavLinksProps) {
    const pathname = usePathname();

    return (
        <ul className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
                const isActive = isNavLinkActive(pathname, link.href);
                return (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isActive
                                    ? "bg-accent text-accent-foreground"
                                    : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            {link.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
