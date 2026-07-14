import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireSession } from "@/lib/rbac";
import { getUserProfile } from "@/lib/queries/user";
import { ProfileForm } from "@/components/forms/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * User profile page (`/profile`).
 *
 * Server component that:
 *   - Resolves the current Better Auth session via {@link requireSession}.
 *     If the session is missing, redirects to `/sign-in?returnUrl=/profile`
 *     (the route group layout also enforces this; we double-check here so
 *     the page is safe to import directly).
 *   - Fetches the profile DTO via {@link getUserProfile}, including derived
 *     applied-scholarships and bookmarks counts (Req 9.7).
 *   - Renders the read-only email field (Req 9.8) alongside the editable
 *     {@link ProfileForm} which handles uploads, RHF + Zod validation, and
 *     the `updateProfile` Server Action.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 26.1
 */

export const metadata: Metadata = {
    title: "Profile — ScholarVista",
    description: "Manage your ScholarVista profile and personal details.",
};

export default async function ProfilePage() {
    let session;
    try {
        session = await requireSession();
    } catch {
        redirect("/sign-in?returnUrl=/profile");
    }

    const profile = await getUserProfile(session.user.id);
    if (!profile) {
        // Session resolved to a user that no longer exists in the DB. Surface
        // a 404 so the user can sign in again with a valid account.
        notFound();
    }

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
                <p className="text-muted-foreground">
                    Update your details so scholarship applications stay current.
                </p>
            </header>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <dt className="text-sm text-muted-foreground">
                                Applied scholarships
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {profile.counts.applications}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm text-muted-foreground">
                                Bookmarks
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {profile.counts.bookmarks}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            readOnly
                            aria-readonly="true"
                            // Visually distinguish the read-only field. The
                            // `readOnly` attribute already prevents edits.
                            className="bg-muted/50"
                        />
                        <p className="text-xs text-muted-foreground">
                            Your email is managed by your sign-in account and
                            cannot be changed here.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Personal details</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProfileForm
                        defaultValues={{
                            name: profile.name,
                            profilePicture: profile.profilePicture,
                            educationalLevel: profile.educationalLevel,
                            major: profile.major,
                            country: profile.country,
                            city: profile.city,
                            dateOfBirth: profile.dateOfBirth,
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
