import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getOptionalSession } from "@/lib/rbac";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

/**
 * Change-password page (`/change-password`).
 *
 * Server component that:
 *   - Requires an authenticated session; unauthenticated users are sent
 *     to `/sign-in?returnUrl=/change-password`. The edge middleware also
 *     guards this path; this server-side check is the defense-in-depth
 *     fallback.
 *   - Renders the ScholarVista wordmark above the centered card.
 *   - Delegates the form itself to `ChangePasswordForm` (client) which
 *     calls `authClient.changePassword`.
 *
 * The (auth) layout already provides the centered, full-height frame.
 *
 * Validates: Requirements 3.10
 */

export const metadata: Metadata = {
    title: "Change password — ScholarVista",
    description: "Update the password on your ScholarVista account.",
};

export default async function ChangePasswordPage() {
    const session = await getOptionalSession();
    if (!session?.user) {
        redirect("/sign-in?returnUrl=/change-password");
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
                    Manage your account
                </p>
            </div>

            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl">Change password</CardTitle>
                    <CardDescription>
                        Choose a new password for your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm />
                </CardContent>
            </Card>
        </div>
    );
}
