/**
 * Legacy CRM-era auth helpers.
 *
 * Superseded by `@/lib/rbac` (`requireSession`, `requireRole`,
 * `getOptionalSession`) per design.md "RBAC Helper". New code MUST import
 * from `@/lib/rbac`. This module remains only as a thin compatibility
 * shim for code paths that have not yet migrated and **must not** gain
 * new callers. The shim keeps its original error strings ("Unauthorized"
 * / "Forbidden ...") so existing callers' error mappings stay intact.
 * The CRM-only `OPERATOR` role is not part of the ScholarVista access
 * model (USER / MODERATOR / ADMIN); the helper that checked it is
 * intentionally removed.
 *
 * Migration map (use these instead):
 *   requireAuth()           → (await requireSession()).user
 *   requireAdmin()          → (await requireRole(["ADMIN"])).user
 *   requireAdminOrModerator → (await requireRole(["ADMIN","MODERATOR"])).user
 *   hasRole(user, roles)    → roles.includes(user.role as Role)
 *
 * Validates: Requirements 3.6, 3.7, 3.9, 3.11
 *
 * @deprecated Import from `@/lib/rbac` instead.
 */

import { getOptionalSession, type Role } from "@/lib/rbac";

/**
 * @deprecated Use `requireSession()` from `@/lib/rbac` and read `.user`.
 */
export async function requireAuth() {
  const session = await getOptionalSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * @deprecated Use `requireRole(["ADMIN"])` from `@/lib/rbac`.
 */
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden - Admin access required");
  }
  return user;
}

/**
 * @deprecated Use `requireRole(["ADMIN", "MODERATOR"])` from `@/lib/rbac`.
 */
export async function requireAdminOrModerator() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
    throw new Error("Forbidden - Admin or Moderator access required");
  }
  return user;
}

/**
 * @deprecated Use `roles.includes(user.role as Role)` directly.
 */
export function hasRole(
  user: { role?: string | null },
  allowedRoles: Role[],
) {
  return user.role ? allowedRoles.includes(user.role as Role) : false;
}
