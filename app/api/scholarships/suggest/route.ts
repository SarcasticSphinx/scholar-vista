/**
 * GET /api/scholarships/suggest?q=<query>
 *
 * Powers the search autocomplete used by the home hero and the public
 * scholarships browse page. Returns a small, mixed list of scholarship and
 * university matches for the supplied query.
 *
 * Response shapes:
 *   - 200 `{ suggestions: SearchSuggestion[] }`  always, even for empty/short
 *     queries (in which case `suggestions` is `[]`)
 *   - 503 `{ error }` + `Retry-After: 30`  database unreachable (P1001/P1002)
 *   - 500 `{ error: "Internal server error" }`  any other thrown error
 *
 * Queries shorter than 2 trimmed characters short-circuit to an empty list
 * without touching the database (mirrors the public catalog's `q` rule).
 *
 * A short private `Cache-Control` window lets the browser reuse identical
 * keystroke results while keeping suggestions fresh.
 */

import { NextResponse } from "next/server";

import { withErrorHandling } from "@/lib/api/with-error-handling";
import { searchSuggestions } from "@/lib/queries/scholarship";

// Prisma requires the Node.js runtime.
export const runtime = "nodejs";
// Suggestions depend on the `q` param, so never statically cache the route.
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request) => {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  // A database-connectivity failure (Prisma P1001/P1002) propagates to
  // `withErrorHandling`, which returns 503 + `Retry-After: 30`.
  const suggestions = await searchSuggestions(q);

  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "private, max-age=15" } },
  );
});
