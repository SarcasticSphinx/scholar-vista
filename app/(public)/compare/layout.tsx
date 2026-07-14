/**
 * Layout for the `/compare` route segment.
 *
 * The compare page itself is a Client Component (it hydrates the cart
 * from `localStorage`), so it can't export `metadata`. We pin the SEO
 * fields to this server-only layout instead, which Next.js merges with
 * the parent `(public)` layout automatically.
 *
 * Validates: Requirements 24.1, 24.6 (SEO metadata) — and provides the
 * metadata surface for Requirements 15.6, 15.7 (comparison page).
 */

import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Compare scholarships | ScholarVista",
    description:
        "Compare your selected scholarships side by side across stipend, coverage, deadline, requirements, and more on ScholarVista.",
    path: "/compare",
});

export default function CompareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
