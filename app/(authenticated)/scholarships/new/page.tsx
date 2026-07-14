/**
 * "Submit a scholarship" page.
 *
 * Server-rendered shell that gates the user-submission form behind two
 * checks:
 *   1. Edge middleware + the authenticated layout already enforce that
 *      the visitor has a valid session.
 *   2. We additionally read the `featureUserSubmittedEnabled` flag from
 *      the singleton `PlatformSettings` row. When the flag is `false`
 *      we render an explanatory page in place of the form so users see
 *      the disabled state immediately rather than after submitting
 *      (Req 11.1, 34.4).
 *
 * On success the form (a client island) shows a "Submitted - pending
 * approval" toast and redirects to `/my-applications` (Req 11.6).
 *
 * Universities for the select are fetched server-side and forwarded to
 * the client form so the dropdown is populated without an extra
 * round-trip.
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 34.4.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { ScholarshipSubmissionForm } from "@/components/forms/scholarship-submission-form";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

/** This page reads per-request settings and the user's session, so it must be dynamic. */
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
    return buildMetadata({
        title: "Submit a scholarship | ScholarVista",
        description:
            "Share a scholarship opportunity with the ScholarVista community. Your submission will be reviewed by our team before publishing.",
        path: "/scholarships/new",
    });
}

const PLATFORM_SETTINGS_ID = "singleton";

/**
 * Resolve the current state of the `userSubmittedScholarships` feature
 * flag. If the singleton row is missing we fall back to the schema
 * default of `true` so a fresh database does not lock the form out.
 */
async function isUserSubmissionEnabled(): Promise<boolean> {
    try {
        const settings = await prisma.platformSettings.findUnique({
            where: { id: PLATFORM_SETTINGS_ID },
            select: { featureUserSubmittedEnabled: true },
        });
        if (!settings) return true;
        return settings.featureUserSubmittedEnabled !== false;
    } catch {
        // If the settings table is unavailable, fail open (the Server
        // Action will recheck before any write).
        return true;
    }
}

/** Lightweight option shape consumed by the client form's Select. */
interface UniversityOption {
    id: string;
    name: string;
}

/**
 * Fetch universities for the form's dropdown. We deliberately bypass
 * the cached `listUniversities` paginator because submitters need the
 * full set sorted alphabetically rather than the catalog ordering. The
 * result is small (universities are bounded) and only loads on this
 * authenticated page.
 */
async function loadUniversityOptions(): Promise<UniversityOption[]> {
    try {
        return await prisma.university.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
    } catch {
        return [];
    }
}

export default async function NewScholarshipPage() {
    const enabled = await isUserSubmissionEnabled();

    return (
        <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <header className="mb-6 space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Submit a scholarship
                </h1>
                <p className="text-sm text-muted-foreground">
                    Help other students by submitting a scholarship opportunity
                    you have discovered.
                </p>
            </header>

            {enabled ? (
                <SubmissionShell />
            ) : (
                <FeatureDisabledNotice />
            )}
        </section>
    );
}

/**
 * Server component that loads the universities list and hands it to the
 * client form. Kept separate from the page so the disabled branch never
 * touches the database for submission-only data.
 */
async function SubmissionShell() {
    const universities = await loadUniversityOptions();
    return <ScholarshipSubmissionForm universities={universities} />;
}

/**
 * Renders when the feature flag is off (Req 34.4). The Server Action
 * will also reject any attempted submission with `FEATURE_DISABLED`,
 * so the UI here exists purely to communicate the state up-front.
 */
function FeatureDisabledNotice() {
    return (
        <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
                <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-amber-500"
                />
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        User-submitted scholarships are temporarily disabled
                    </CardTitle>
                    <CardDescription>
                        Our administrators have paused community submissions.
                        You can still browse and apply to existing
                        scholarships, and we will accept submissions again
                        soon.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button asChild variant="outline">
                    <Link href="/scholarships">Browse scholarships</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
