import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy — route gating for ScholarVista.
 *
 * Protects authenticated routes by checking for the Better Auth session
 * cookie. Unauthenticated requests are redirected to `/sign-in` with a
 * `returnUrl` query param so the sign-in page can bounce the user back
 * after a successful login.
 *
 * Protected path patterns (Req 3.6, 3.9, 3.11, 8.5):
 *   /profile
 *   /change-password
 *   /my-applications, /my-bookmarks, /my-reviews
 *   /notifications
 *   /scholarships/:id/apply
 *   /scholarships/new
 *   /dashboard (and all sub-paths)
 *
 * The proxy also passes the current pathname as `x-pathname` header so
 * server layouts can read it without importing `next/headers` in edge
 * contexts.
 *
 * Validates: Requirements 3.6, 3.9, 3.11, 8.5.
 */

/** Cookie names used by Better Auth for the session token. */
const SESSION_COOKIE_NAMES = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
];

/**
 * Paths that require an authenticated session. Checked via
 * `pathname.startsWith(prefix)` so sub-paths are covered automatically.
 */
const PROTECTED_PREFIXES = [
    "/profile",
    "/change-password",
    "/my-applications",
    "/my-bookmarks",
    "/my-reviews",
    "/notifications",
    "/scholarships/new",
    "/dashboard",
];

/**
 * Exact-match patterns for dynamic protected routes that can't be covered
 * by a simple prefix (e.g. `/scholarships/:id/apply`).
 */
const PROTECTED_PATTERNS = [
    /^\/scholarships\/[^/]+\/apply(\/.*)?$/,
];

/** Return `true` when the request carries a Better Auth session cookie. */
function hasSessionCookie(req: NextRequest): boolean {
    return SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
}

/** Return `true` when the pathname requires authentication. */
function isProtectedPath(pathname: string): boolean {
    if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return true;
    }
    return PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Pass the pathname to server layouts via a request header.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    // Gate protected routes behind session presence.
    if (isProtectedPath(pathname) && !hasSessionCookie(request)) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("returnUrl", pathname);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, logos, and image files
         */
        "/((?!api|_next/static|_next/image|favicon.ico|logo-|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
    ],
};
