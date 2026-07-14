import { redirect } from "next/navigation";

import { requireRole } from "@/lib/rbac";

/**
 * Admin sub-route layout.
 *
 * The parent `(dashboard)/layout.tsx` already gates the tree to
 * `ADMIN` or `MODERATOR` and renders the placeholder Sidebar + Topbar
 * shell. This nested layout adds the stricter `ADMIN`-only check for
 * `/admin/**` routes and otherwise passes through.
 *
 * On `FORBIDDEN` (e.g. signed-in MODERATOR hitting an admin-only route)
 * we send the user back to `/` rather than the dashboard root, mirroring
 * the redirect contract of the parent layout.
 *
 * The boilerplate-era `DashboardLayoutClient` chrome is intentionally
 * removed here so the parent layout's shell is the single source of
 * truth; the real ScholarVista Sidebar/Topbar arrive in task 5.4.
 *
 * Validates: Requirements 3.7, 3.11, 16.5
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        await requireRole(["ADMIN"]);
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "FORBIDDEN") {
            redirect("/");
        }
        redirect("/sign-in");
    }

    return <>{children}</>;
}
