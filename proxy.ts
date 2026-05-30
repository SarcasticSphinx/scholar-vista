import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy
 *
 * The proxy runs before routes are rendered and is used for:
 * - Authentication checks (optimistic, cookie-based)
 * - Redirects and rewrites
 * - Modifying request/response headers
 *
 * Note: Proxy defaults to Node.js runtime in Next.js 16
 * Avoid database queries here - use optimistic checks only
 */

// Protected routes that require authentication
const protectedRoutes = ["/admin", "/operator"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get session token from cookies (optimistic check)
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;

    // Check if accessing a protected route
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // If no session and trying to access protected routes, redirect to signin
    if (!sessionToken && isProtectedRoute) {
        const signInUrl = new URL("/signin", request.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
    }

    // For role-based checks, we pass the pathname to the layout
    // The layout can then perform database checks for authorization
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
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
