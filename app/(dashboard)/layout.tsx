import { redirect } from "next/navigation";

import { requireRole } from "@/lib/rbac";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { SkipToContent } from "@/components/layout/skip-to-content";

/**
 * Dashboard route group layout.
 *
 * Gates the entire dashboard tree (admin + moderator routes) behind the
 * role allow-list `["ADMIN", "MODERATOR"]` via {@link requireRole}. The
 * helper throws typed `Error("UNAUTHORIZED")` when no session is present
 * and `Error("FORBIDDEN")` when the session's role is not in the allow-
 * list — we map those onto the redirects mandated by the design:
 *
 *   - UNAUTHORIZED → `/sign-in`
 *   - FORBIDDEN    → `/`     (sends authed users without dashboard
 *                             access back to the public home page).
 *
 * Renders the canonical `<Sidebar />` (collapsed by default below `lg`
 * via `defaultOpen={false}` — see Req 23.5) plus the topbar with sidebar
 * trigger and theme toggle.
 *
 * Server component.
 *
 * Validates: Requirements 3.7, 3.11, 16.5, 22.1, 23.5, 27.2
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["ADMIN", "MODERATOR"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") {
      redirect("/");
    }
    // UNAUTHORIZED, missing session, or any other resolution failure.
    redirect("/sign-in");
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <SkipToContent />
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardTopbar />
        <main id="main" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
