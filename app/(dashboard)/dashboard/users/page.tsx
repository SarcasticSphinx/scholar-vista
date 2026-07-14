/**
 * Admin users management list (`/dashboard/users`).
 *
 * Server component that renders a paginated table of all users (10 per
 * page) with a name/email search box. Each row shows the user's name,
 * email, role, and registration date (Req 19.1) plus a role-change
 * control.
 *
 * Role changes (Req 19.2) are gated to ADMINs: MODERATORs may view the
 * list but the {@link RoleSelect} controls render disabled for them
 * (`changeRole` is admin-only at the action layer regardless). The signed-
 * in admin's own row is disabled because self-change is forbidden — the
 * action returns `FORBIDDEN_SELF_CHANGE`.
 *
 * URL contract:
 *   - `q`    — search string applied to name + email (case-insensitive,
 *              ≥ 2 chars to take effect).
 *   - `page` — 1-indexed page number, clamped server-side.
 *
 * Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Users as UsersIcon, SearchX } from "lucide-react";

import { requireRole } from "@/lib/rbac";
import { listUsersAdmin } from "@/lib/queries/user";
import { formatDate } from "@/lib/intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { RoleSelect } from "@/components/dashboard/role-select";
import { UserSearch } from "@/components/dashboard/user-search";
import { RoleBadge } from "@/components/dashboard/role-badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { UserRole } from "@/lib/validation/user";

/** Users list is request-time (auth-gated, no Data Cache). */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

/** Coerce a `searchParams` entry into a single string. */
function firstParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
}

/** Parse the `page` URL param to a positive integer, defaulting to 1. */
function parsePage(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return parsed;
}

interface UsersPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardUsersPage({
    searchParams,
}: UsersPageProps) {
    // The dashboard layout already gates to ADMIN/MODERATOR; resolve the
    // session here so we know the viewer's role (to gate the role-change
    // UI) and their id (to disable the self-row).
    let session;
    try {
        session = await requireRole(["ADMIN", "MODERATOR"]);
    } catch {
        redirect("/");
    }

    const isAdmin = (session.user.role as UserRole) === "ADMIN";
    const currentUserId = session.user.id;

    const params = await searchParams;
    const query = firstParam(params.q).trim();
    const page = parsePage(firstParam(params.page));

    const result = await listUsersAdmin({
        search: query || undefined,
        page,
        pageSize: PAGE_SIZE,
    });

    const hasResults = result.items.length > 0;
    const headingId = "users-heading";

    return (
        <section aria-labelledby={headingId} className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1
                        id={headingId}
                        className="text-2xl font-semibold tracking-tight"
                    >
                        Users
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin
                            ? "Manage user accounts and roles across the platform."
                            : "View user accounts across the platform."}
                    </p>
                </div>
                <UserSearch initialQuery={query} className="w-full sm:max-w-sm" />
            </header>

            <p className="sr-only" aria-live="polite">
                {hasResults
                    ? `Showing ${result.items.length} of ${result.total} users`
                    : "No users match your search"}
            </p>

            {hasResults ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Registered</TableHead>
                                <TableHead className="text-right">
                                    Change role
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.items.map((user) => {
                                const isSelf = user.id === currentUserId;
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/dashboard/users/${user.id}`}
                                                className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                                            >
                                                {user.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <RoleBadge role={user.role} />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(user.createdAt, undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                <RoleSelect
                                                    userId={user.id}
                                                    currentRole={user.role}
                                                    disabled={!isAdmin}
                                                    isSelf={isSelf}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <EmptyState
                    title="No users found"
                    description={
                        query
                            ? `We couldn't find any users matching "${query}". Try a different name or email.`
                            : "Users will appear here once they register."
                    }
                    icon={query ? SearchX : UsersIcon}
                    action={
                        query
                            ? { label: "Clear search", href: "/dashboard/users" }
                            : undefined
                    }
                />
            )}

            {hasResults && result.totalPages > 1 ? (
                <Pagination
                    currentPage={result.page}
                    totalPages={result.totalPages}
                    baseUrl="/dashboard/users"
                />
            ) : null}
        </section>
    );
}
