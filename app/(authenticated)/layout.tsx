import { redirect } from "next/navigation";

import { requireSession } from "@/lib/rbac";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SkipToContent } from "@/components/layout/skip-to-content";

/**
 * Authenticated route group layout.
 *
 * Protects user-only routes (profile, my-applications, my-bookmarks,
 * my-reviews, notifications, scholarship submission, application form) by
 * resolving the current Better Auth session via {@link requireSession}.
 * Edge middleware already gates these paths on cookie presence; this
 * layout adds the server-side check so the session is verified before any
 * downstream RSC reads it.
 *
 * On any error (UNAUTHORIZED or otherwise) the user is redirected to the
 * sign-in page. The redirect is the safest fallback for transient session
 * decoding failures.
 *
 * Renders the same Navbar + Footer shell as public routes (Req 22.1,
 * 23.5) and the skip-to-main link as the first focusable element
 * (Req 27.2).
 *
 * Validates: Requirements 3.7, 3.11, 22.1, 23.5, 27.2
 */
export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        await requireSession();
    } catch {
        // UNAUTHORIZED (or any session resolution failure) — bounce to sign-in.
        redirect("/sign-in");
    }

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
