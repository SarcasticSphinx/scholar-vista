import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getOptionalSession } from "@/lib/rbac";
import { SignUpForm } from "@/components/auth/sign-up-form";

/**
 * Sign-up page (`/sign-up`).
 *
 * Server component that:
 *   - Redirects already-signed-in users to `/` (Req 3.7 — auth pages do
 *     not display when an active session exists).
 *   - Renders the ScholarVista wordmark above the centered card.
 *   - Delegates the form itself to `SignUpForm` (client) which handles
 *     `returnUrl` from search params and the Google OAuth flow.
 *
 * The (auth) layout already provides the centered, full-height frame.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8
 */

export const metadata: Metadata = {
    title: "Create account — ScholarVista",
    description: "Create your ScholarVista account.",
};

export default async function SignUpPage() {
    const session = await getOptionalSession();
    if (session?.user) {
        redirect("/");
    }

    return (
        <div className="w-full max-w-md px-4">
            <div className="mb-8 flex flex-col items-center text-center">
                <Link href="/" aria-label="ScholarVista — home">
                    <Image
                        src="/scholar-vista-logo.png"
                        alt="ScholarVista"
                        width={1966}
                        height={694}
                        priority
                        className="h-10 w-auto"
                    />
                </Link>
                <p className="mt-4 text-muted-foreground">
                    Create your account to get started
                </p>
            </div>

            <SignUpForm />
        </div>
    );
}
