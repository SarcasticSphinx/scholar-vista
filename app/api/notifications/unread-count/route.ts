/**
 * GET /api/notifications/unread-count
 *
 * Returns the number of unread notifications for the authenticated user.
 * Powers the navbar `NotificationBell` badge polling (every 60s).
 *
 * Response shapes:
 *   - 200 `{ count: number }`  authenticated, count is non-negative
 *   - 401 `{ count: 0 }`       no session (badge hidden)
 *   - 503 `{ error }` + `Retry-After: 30`  database unreachable (P1001/P1002)
 *   - 500 `{ error: "Internal server error" }`  any other thrown error
 *
 * The route is intentionally tiny: it does no caching at the framework
 * layer, only the DB count, so the bell always reflects fresh state. The
 * `withErrorHandling` wrapper supplies the 503/500 fallbacks; this handler
 * only owns the success path and the anonymous `{ count: 0 }` response.
 *
 * Validates: Requirements 33.2, 33.3, 33.6, 28.5.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { withErrorHandling } from "@/lib/api/with-error-handling";
import { auth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries/notification";

// Always run on the Node.js runtime so Prisma works.
export const runtime = "nodejs";
// Don't cache — the bell needs fresh counts.
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    // Anonymous callers: return 401 with a count of 0 so the bell hides.
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  // A database-connectivity failure here (Prisma P1001/P1002) propagates to
  // `withErrorHandling`, which returns 503 + `Retry-After: 30`.
  const count = await getUnreadCount(session.user.id);
  return NextResponse.json({ count });
});
