/**
 * Public / authenticated Navbar.
 *
 * Server component that renders the platform's primary navigation. The
 * Navbar:
 *   - Reads the current session via `getOptionalSession()` so it can show
 *     either a "Sign in" link (anonymous) or a user menu (authenticated)
 *     without triggering a redirect.
 *   - Shows desktop navigation (`md+`) inline and delegates the mobile
 *     drawer to `MobileMenu` (client) so this component itself stays a
 *     server component (Req 22.1, 23.2).
 *   - Includes the `ThemeToggle` (client island) and a skip-to-main link
 *     as the first focusable element (Req 27.2).
 *   - Mounts the `NotificationBell` (client island) only when authed,
 *     pre-seeded with the unread count from the database so the badge
 *     paints on first render (Req 33.2, 33.3, 33.6).
 *
 * Validates: Requirements 22.1, 22.2, 23.2, 23.5, 23.7, 27.2,
 *            33.2, 33.3, 33.4, 33.5, 33.6
 */

import Image from "next/image";
import Link from "next/link";

import { getOptionalSession } from "@/lib/rbac";
import { getUnreadCount } from "@/lib/queries/notification";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileMenu, type NavLink } from "@/components/layout/mobile-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";

const PRIMARY_LINKS: NavLink[] = [
    { href: "/", label: "Home" },
    { href: "/scholarships", label: "Scholarships" },
    { href: "/universities", label: "Universities" },
    { href: "/compare", label: "Compare" },
    { href: "/guide", label: "Guide" },
    { href: "/help", label: "Help" },
];

export async function Navbar() {
    const session = await getOptionalSession();
    const user = session?.user ?? null;

    // Fetch the initial unread count server-side so the bell badge paints
    // on first render without waiting for the client poll. We swallow
    // failures to keep the navbar resilient — the bell will fall back to
    // its own polled value.
    let initialUnreadCount = 0;
    if (user) {
        try {
            initialUnreadCount = await getUnreadCount(user.id);
        } catch {
            initialUnreadCount = 0;
        }
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav
                aria-label="Primary"
                className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
            >
                {/* Brand */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        aria-label="ScholarVista — home"
                        className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Image
                            src="/scholar-vista-logo.png"
                            alt="ScholarVista"
                            width={1966}
                            height={694}
                            priority
                            className="h-8 w-auto"
                        />
                    </Link>

                    {/* Desktop links — hidden below md */}
                    <ul className="hidden items-center gap-1 md:flex">
                        {PRIMARY_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />

                    {user ? (
                        <>
                            <NotificationBell
                                initialCount={initialUnreadCount}
                            />
                            <UserMenu
                                user={{
                                    name: user.name ?? "Account",
                                    email: user.email ?? "",
                                    image: user.image ?? null,
                                    role:
                                        (user as { role?: string }).role ??
                                        "USER",
                                }}
                            />
                        </>
                    ) : (
                        <Button asChild size="sm" className="hidden md:inline-flex">
                            <Link href="/sign-in">Sign in</Link>
                        </Button>
                    )}

                    <MobileMenu
                        links={PRIMARY_LINKS}
                        footer={
                            user ? null : (
                                <Button asChild className="w-full">
                                    <Link href="/sign-in">Sign in</Link>
                                </Button>
                            )
                        }
                    />
                </div>
            </nav>
        </header>
    );
}
