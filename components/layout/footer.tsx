/**
 * Site footer.
 *
 * Server component rendered by the public and authenticated layouts. The
 * footer surfaces:
 *   - The wordmark and copyright (year computed at render time).
 *   - Links to the static informational pages (Help, Guide) and legal
 *     placeholders (Privacy, Terms). The legal pages are not yet built;
 *     these anchors point at `/privacy` and `/terms` so they will start
 *     working as soon as the corresponding routes are added.
 *
 * Uses semantic `<footer>` and `<nav>` elements with explicit
 * `aria-label`s so assistive tech can distinguish primary navigation
 * (in the Navbar) from secondary footer navigation.
 *
 * Validates: Requirements 22.1, 23.5, 27.2
 */

import Image from "next/image";
import Link from "next/link";

const FOOTER_LINKS: { href: string; label: string }[] = [
    { href: "/help", label: "Help" },
    { href: "/guide", label: "Guide" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
];

export function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t bg-background">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                    <Image
                        src="/scholar-vista-logo.png"
                        alt="ScholarVista"
                        width={1966}
                        height={694}
                        className="h-6 w-auto"
                    />
                    <p>© {year} ScholarVista. All rights reserved.</p>
                </div>

                <nav aria-label="Footer">
                    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {FOOTER_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
