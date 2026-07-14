import { redirect } from "next/navigation";

/**
 * Legacy `/signin` path (no hyphen).
 *
 * Carryover from the boilerplate. The canonical sign-in route is
 * `/sign-in` (with a hyphen) — that's where middleware sends
 * unauthenticated users and what the navbar/links use. This page
 * forwards every visitor (auth or anon) to the canonical path so old
 * bookmarks and any leftover internal links keep working.
 */
export default function LegacySigninRedirect() {
    redirect("/sign-in");
}
