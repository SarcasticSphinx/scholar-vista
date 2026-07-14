/**
 * Public route group layout.
 *
 * Wraps unauthenticated catalog routes (home, scholarships, universities,
 * compare, guide, help) with the Navbar + Footer shell. The
 * skip-to-main-content link is rendered as the first focusable element
 * (Req 27.2) and the layout uses semantic `<main id="main">` so the
 * skip link can target it.
 *
 * Server component — Navbar/Footer are themselves server components and
 * mount their own client islands (ThemeToggle, MobileMenu, UserMenu).
 *
 * Validates: Requirements 22.1, 23.5, 27.2
 */

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SkipToContent } from "@/components/layout/skip-to-content";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <SkipToContent />
            <Navbar />
            <main id="main" className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
