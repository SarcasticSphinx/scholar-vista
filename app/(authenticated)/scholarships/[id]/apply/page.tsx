/**
 * Scholarship application page.
 *
 * Server-rendered shell for the multi-step application form. Behaviour:
 *   1. Resolves the current session via `requireSession` (the parent
 *      layout already gates this, but we re-read here to avoid prop
 *      drilling).
 *   2. Loads the scholarship via `getScholarshipById` and returns
 *      `notFound()` when missing or unapproved (Req 6.9 carries
 *      forward — only public, approved scholarships accept
 *      applications through this route).
 *   3. If the scholarship's `deadline` has passed, renders an
 *      "Applications closed" banner instead of the form (Req 6.8).
 *   4. Pre-checks `hasUserApplied(userId, scholarshipId)`; when true
 *      shows a "You've already applied" banner with a link to
 *      `/my-applications` (Req 7.6).
 *   5. Otherwise renders the client `ApplicationFormStepper`.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarOff, CheckCircle2 } from "lucide-react";

import { ApplicationFormStepper } from "@/components/forms/application-form-stepper";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { hasUserApplied } from "@/lib/queries/application";
import { getScholarshipById } from "@/lib/queries/scholarship";
import { requireSession } from "@/lib/rbac";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/intl";

/** Per-user data: never cached at build time. */
export const dynamic = "force-dynamic";

/**
 * Whether the scholarship deadline has passed.
 *
 * Reads the system clock — kept outside the component body so the React
 * compiler's purity rule doesn't flag the render path. Server components
 * already evaluate this once per request, so the result is stable for the
 * duration of a single render.
 */
function isDeadlinePassed(deadline: Date): boolean {
    if (!Number.isFinite(deadline.getTime())) return false;
    return deadline.getTime() < Date.now();
}

interface ApplyPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({
    params,
}: ApplyPageProps): Promise<Metadata> {
    const { id } = await params;
    const scholarship = await getScholarshipById(id);
    const title = scholarship
        ? `Apply: ${scholarship.title} | ScholarVista`
        : "Apply for scholarship | ScholarVista";
    return buildMetadata({
        title,
        description:
            "Submit your scholarship application through ScholarVista's secure multi-step form.",
        path: `/scholarships/${id}/apply`,
    });
}

export default async function ApplyToScholarshipPage({
    params,
}: ApplyPageProps) {
    const { id } = await params;

    // The route group's layout already enforces authentication — we
    // re-read the session here to access the user id.
    const session = await requireSession();

    const scholarship = await getScholarshipById(id);
    if (!scholarship) {
        notFound();
    }

    const deadlineDate = new Date(scholarship.deadline);
    const deadlinePassed = isDeadlinePassed(deadlineDate);

    // Only check for an existing application when the deadline is still
    // open — the closed banner short-circuits before we hit the DB.
    const alreadyApplied = deadlinePassed
        ? false
        : await hasUserApplied(session.user.id, id);

    return (
        <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <header className="mb-6 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                    {scholarship.university.name}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                    Apply: {scholarship.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                    Deadline:{" "}
                    <time dateTime={scholarship.deadline}>
                        {formatDate(deadlineDate)}
                    </time>
                </p>
            </header>

            {deadlinePassed ? (
                <ApplicationsClosedBanner />
            ) : alreadyApplied ? (
                <AlreadyAppliedBanner />
            ) : (
                <ApplicationFormStepper scholarshipId={scholarship.id} />
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Banners                                                              */
/* ------------------------------------------------------------------ */

/** Renders when the scholarship deadline is in the past (Req 6.8). */
function ApplicationsClosedBanner() {
    return (
        <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
                <CalendarOff
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-destructive"
                />
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        Applications closed
                    </CardTitle>
                    <CardDescription>
                        The deadline for this scholarship has passed and we
                        are no longer accepting new applications.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button asChild variant="outline">
                    <Link href="/scholarships">Browse open scholarships</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

/**
 * Renders when the current user has already submitted an application
 * for this scholarship (Req 7.6). Links to `/my-applications` so the
 * user can confirm or track its status.
 */
function AlreadyAppliedBanner() {
    return (
        <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
                <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-emerald-500"
                />
                <div className="space-y-1">
                    <CardTitle className="text-base">
                        You&apos;ve already applied
                    </CardTitle>
                    <CardDescription>
                        Our records show an existing application for this
                        scholarship. You can review its status from your
                        applications page.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button asChild variant="outline">
                    <Link href="/my-applications">View my applications</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
