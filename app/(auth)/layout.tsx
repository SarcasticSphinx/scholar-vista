/**
 * Auth route group layout.
 *
 * Hosts the unauthenticated identity flows (sign-in, sign-up,
 * change-password) inside a single centered card frame. The container uses
 * `min-h-screen flex items-center justify-center bg-background` so any
 * page placed inside the route group renders as a centered card without
 * having to repeat the wrapper.
 *
 * Server component — pages may still be either server or client.
 *
 * Validates: Requirements 23.5
 */
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            {children}
        </div>
    );
}
