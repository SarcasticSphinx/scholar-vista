/**
 * RBAC helpers for ScholarVista server-side route gating.
 *
 * Centralizes the three primitives every Server Component, Server Action,
 * and Route Handler uses to gate access:
 *
 *   - {@link requireSession} — assert an authenticated session exists.
 *   - {@link requireRole}    — assert the session's role is in an allow-list.
 *   - {@link getOptionalSession} — non-throwing read for branch-on-auth UIs.
 *
 * Errors are intentionally typed as `Error("UNAUTHORIZED")` and
 * `Error("FORBIDDEN")` (matching the design verbatim) so callers can map
 * them onto redirects or `ActionResult` failures via a shared catch.
 *
 * Validates: Requirements 3.6, 3.7, 3.9, 3.11
 */

import { headers } from "next/headers";
import { auth, type Session } from "@/lib/auth";

/** Roles recognized by ScholarVista's authorization model. */
export type Role = "USER" | "MODERATOR" | "ADMIN";

/**
 * Read the current session. Throws `Error("UNAUTHORIZED")` if no session
 * cookie / token resolves to an authenticated user.
 */
export async function requireSession(): Promise<Session> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

/**
 * Read the current session and assert the user's role is in `roles`.
 * Throws `Error("UNAUTHORIZED")` if no session, or `Error("FORBIDDEN")`
 * if the session's role is not allowed.
 */
export async function requireRole(roles: Array<Role>): Promise<Session> {
  const s = await requireSession();
  if (!roles.includes(s.user.role as Role)) throw new Error("FORBIDDEN");
  return s;
}

/**
 * Non-throwing variant of {@link requireSession}. Returns the session if
 * one exists, otherwise `null`. Use in components that branch on auth
 * state instead of redirecting (e.g. navbar, scholarship detail "Apply
 * Now" gating, bookmark icon).
 */
export async function getOptionalSession(): Promise<Session | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  return s ?? null;
}
