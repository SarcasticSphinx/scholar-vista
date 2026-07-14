/**
 * Augmented Better Auth session/user types for ScholarVista.
 *
 * The Better Auth instance in `@/lib/auth` declares ScholarVista-specific
 * `additionalFields` (role + profile extensions) on the User model. The
 * inferred `Session`/`User` types from `auth.$Infer.Session` therefore
 * already include those fields. This module simply re-exports them under
 * stable names so application code never has to reach into Better Auth's
 * internals, and adds a small `UserRole` type guard for role-gating.
 *
 * Validates: Requirements 2.1, 3.7
 */

import type { Session as InferredSession, User as InferredUser } from "@/lib/auth";
import type { UserRole } from "@/lib/validation/user";

/** Authenticated session (Better Auth, augmented). */
export type Session = InferredSession;

/**
 * Authenticated user, augmented with the ScholarVista profile fields:
 * `role`, `profilePicture`, `educationalLevel`, `major`, `country`,
 * `city`, `dateOfBirth`.
 */
export type User = InferredUser;

export type { UserRole };

/**
 * Narrow a raw role string to one of an allowed `UserRole` set.
 *
 * Use in RBAC checks to constrain inputs at type level:
 *
 *   if (!isRole(session.user.role, ["ADMIN", "MODERATOR"])) redirect("/");
 */
export function isRole(
  role: string,
  allowed: readonly UserRole[],
): role is UserRole {
  return (allowed as readonly string[]).includes(role);
}
