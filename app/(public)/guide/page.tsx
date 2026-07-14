/**
 * Scholarship Guide page — `/guide`.
 *
 * Server-rendered informational page that walks users through the four
 * core workflows on the platform:
 *
 *   - How to search for scholarships  (anchor: `#search`)
 *   - How to apply                    (anchor: `#apply`)
 *   - How to track application status (anchor: `#track`)
 *   - Tips for strengthening apps     (anchor: `#tips`)
 *
 * The page uses semantic landmarks (`<article>`, `<section>`, `<h1>`,
 * `<h2>`) so screen readers and search engines can index the structure,
 * and exposes per-section anchor IDs (Req 29.5). A sticky table-of-
 * contents is rendered for `lg+` viewports and hidden on smaller screens.
 *
 * Server-rendered for SEO (Req 29.4); SEO metadata is built via
 * `buildMetadata` (Req 24.1, 24.4, 24.6).
 *
 * Validates: Requirements 24.4, 29.1, 29.4, 29.5
 */

import Link from "next/link";
import {
    Search,
    FileText,
    ListChecks,
    Sparkles,
    BookmarkPlus,
    ArrowRight,
} from "lucide-react";

import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = buildMetadata({
    title: "Scholarship Guide — ScholarVista",
    description:
        "Learn how to search, apply, track, and strengthen your scholarship applications on ScholarVista with our step-by-step guide.",
    path: "/guide",
});

interface GuideSection {
    id: "search" | "apply" | "track" | "tips";
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    summary: string;
}

const SECTIONS: readonly GuideSection[] = [
    {
        id: "search",
        title: "How to search for scholarships",
        icon: Search,
        summary:
            "Find opportunities that fit your profile using filters, keywords, and saved searches.",
    },
    {
        id: "apply",
        title: "How to apply",
        icon: FileText,
        summary:
            "Walk through the multi-step application form with required documents and payment.",
    },
    {
        id: "track",
        title: "How to track application status",
        icon: ListChecks,
        summary:
            "Monitor every application from submission to decision in one place.",
    },
    {
        id: "tips",
        title: "Tips for strengthening applications",
        icon: Sparkles,
        summary:
            "Practical advice from reviewers on essays, recommendations, and presentation.",
    },
] as const;

export default function ScholarshipGuidePage() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
            {/* Page header */}
            <header className="mb-10 max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-wider text-primary">
                    Scholarship Guide
                </p>
                <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    Your roadmap to winning scholarships
                </h1>
                <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                    Whether you&apos;re searching for your first opportunity or refining a final
                    submission, this guide walks you through every step of the journey on
                    ScholarVista.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[16rem_1fr] lg:gap-12">
                {/* Sticky desktop table of contents — hidden on mobile/tablet */}
                <aside
                    aria-label="Guide sections"
                    className="hidden lg:block"
                >
                    <nav
                        aria-label="On this page"
                        className="sticky top-24 space-y-3"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            On this page
                        </p>
                        <ol className="space-y-1 border-l border-border">
                            {SECTIONS.map((section, index) => (
                                <li key={section.id}>
                                    <Link
                                        href={`#${section.id}`}
                                        className="-ml-px flex items-start gap-3 border-l-2 border-transparent py-2 pl-4 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                                    >
                                        <span className="text-xs font-medium tabular-nums text-muted-foreground/70">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <span>{section.title}</span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </nav>
                </aside>

                {/* Main article */}
                <article className="min-w-0 space-y-12">
                    {/* Section: Search */}
                    <section
                        id="search"
                        aria-labelledby="search-heading"
                        className="scroll-mt-24"
                    >
                        <SectionHeader
                            id="search"
                            index={1}
                            icon={Search}
                            title="How to search for scholarships"
                            headingId="search-heading"
                        />
                        <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90">
                            <p>
                                ScholarVista indexes thousands of approved scholarships from
                                universities and partner institutions worldwide. Start by
                                visiting the{" "}
                                <Link
                                    href="/scholarships"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Scholarships page
                                </Link>{" "}
                                and use the search bar at the top to look up titles,
                                universities, or subjects. Searches need at least two
                                characters and match case-insensitively.
                            </p>
                        </div>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <TipCard
                                title="Filter by what matters"
                                body="Narrow results by category, country, funding type, and deadline window so only relevant opportunities surface."
                            />
                            <TipCard
                                title="Sort intentionally"
                                body="Sort by deadline ascending when you're racing the clock, or by rating when you want the strongest opportunities first."
                            />
                            <TipCard
                                title="Bookmark to revisit"
                                body="Save promising scholarships with the bookmark icon — they'll be waiting in My Bookmarks when you sign in."
                                icon={BookmarkPlus}
                            />
                            <TipCard
                                title="Compare side by side"
                                body="Add 2 to 3 scholarships to the comparison tray to weigh stipend, coverage, and requirements at a glance."
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Section: Apply */}
                    <section
                        id="apply"
                        aria-labelledby="apply-heading"
                        className="scroll-mt-24"
                    >
                        <SectionHeader
                            id="apply"
                            index={2}
                            icon={FileText}
                            title="How to apply"
                            headingId="apply-heading"
                        />
                        <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90">
                            <p>
                                Once you&apos;ve found a scholarship that fits, open its detail
                                page and select <strong>Apply Now</strong>. You&apos;ll need to
                                be signed in. New here?{" "}
                                <Link
                                    href="/sign-up"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Create an account
                                </Link>{" "}
                                in under a minute.
                            </p>
                            <p>
                                The application form is split into three short steps so you
                                can save mental load and move quickly.
                            </p>
                        </div>
                        <ol className="mt-6 space-y-4">
                            <ApplyStep
                                step={1}
                                title="Personal information"
                                body="Name, contact details, date of birth, and gender. We pre-fill what we can from your profile."
                            />
                            <ApplyStep
                                step={2}
                                title="Academic details"
                                body="Current educational level, major, and the degree you're applying for."
                            />
                            <ApplyStep
                                step={3}
                                title="Address and submission"
                                body="Country and city of residence, then a final review before you submit. If the scholarship has an application fee, payment runs on the next step."
                            />
                        </ol>
                        <div className="mt-6 rounded-lg border border-amber-200/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                            <p>
                                <strong>Heads up:</strong> you can apply once per scholarship.
                                Double-check your details before submitting — duplicate
                                submissions are rejected automatically.
                            </p>
                        </div>
                    </section>

                    <Separator />

                    {/* Section: Track */}
                    <section
                        id="track"
                        aria-labelledby="track-heading"
                        className="scroll-mt-24"
                    >
                        <SectionHeader
                            id="track"
                            index={3}
                            icon={ListChecks}
                            title="How to track application status"
                            headingId="track-heading"
                        />
                        <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90">
                            <p>
                                Every application you submit appears under{" "}
                                <Link
                                    href="/my-applications"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    My Applications
                                </Link>
                                , sorted with the most recent first. Each row shows a status
                                badge so you can tell at a glance where things stand.
                            </p>
                        </div>
                        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                            <StatusItem
                                label="Pending"
                                description="Submitted and awaiting payment confirmation if fees apply."
                                tone="muted"
                            />
                            <StatusItem
                                label="Under Review"
                                description="A reviewer is currently evaluating your application."
                                tone="info"
                            />
                            <StatusItem
                                label="Approved"
                                description="Congratulations — you've been selected. Watch your notifications for next steps."
                                tone="success"
                            />
                            <StatusItem
                                label="Rejected"
                                description="The application wasn't selected this round. Check feedback and consider similar opportunities."
                                tone="warning"
                            />
                        </ul>
                        <p className="mt-4 text-sm text-muted-foreground">
                            You&apos;ll also receive in-app notifications whenever a status
                            changes, so there&apos;s no need to refresh constantly.
                        </p>
                    </section>

                    <Separator />

                    {/* Section: Tips */}
                    <section
                        id="tips"
                        aria-labelledby="tips-heading"
                        className="scroll-mt-24"
                    >
                        <SectionHeader
                            id="tips"
                            index={4}
                            icon={Sparkles}
                            title="Tips for strengthening applications"
                            headingId="tips-heading"
                        />
                        <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90">
                            <p>
                                Strong applications share a few common traits. Use these as a
                                checklist before you submit.
                            </p>
                        </div>
                        <ul className="mt-6 space-y-4">
                            <TipItem
                                title="Tailor every essay"
                                body="Speak directly to the scholarship's mission and selection criteria. Generic essays are easy to spot and hard to score."
                            />
                            <TipItem
                                title="Quantify your impact"
                                body="Replace vague claims with concrete numbers — students mentored, hours volunteered, projects shipped, awards earned."
                            />
                            <TipItem
                                title="Ask early for recommendations"
                                body="Give recommenders at least two weeks and share your essay drafts so they can reinforce your themes."
                            />
                            <TipItem
                                title="Proofread, then proofread again"
                                body="Read your application aloud, and ask a peer to catch typos and unclear phrasing before submission."
                            />
                            <TipItem
                                title="Apply early"
                                body="Avoid the deadline rush. Earlier submissions face fewer technical hiccups and give you time to fix issues if they arise."
                            />
                        </ul>

                        {/* Closing CTA */}
                        <Card className="mt-10 bg-primary/5">
                            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Ready to apply?</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Browse the latest approved scholarships and start your
                                        next application.
                                    </p>
                                </div>
                                <Button asChild size="lg">
                                    <Link href="/scholarships">
                                        Browse scholarships
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </section>
                </article>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Internal presentational helpers                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
    id,
    index,
    icon: Icon,
    title,
    headingId,
}: {
    id: string;
    index: number;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    headingId: string;
}) {
    return (
        <div className="mb-4 flex items-start gap-4">
            <span
                aria-hidden="true"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Step {index}
                </p>
                <h2
                    id={headingId}
                    className="mt-1 scroll-mt-24 text-2xl font-semibold tracking-tight sm:text-3xl"
                >
                    <a
                        href={`#${id}`}
                        className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                        {title}
                    </a>
                </h2>
            </div>
        </div>
    );
}

function TipCard({
    title,
    body,
    icon: Icon,
}: {
    title: string;
    body: string;
    icon?: React.ComponentType<{ className?: string }>;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-start gap-3">
                    {Icon ? (
                        <span
                            aria-hidden="true"
                            className="mt-0.5 text-primary"
                        >
                            <Icon className="h-4 w-4" />
                        </span>
                    ) : null}
                    <div>
                        <h3 className="text-sm font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ApplyStep({
    step,
    title,
    body,
}: {
    step: number;
    title: string;
    body: string;
}) {
    return (
        <li className="flex gap-4 rounded-lg border bg-card p-4">
            <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
                {step}
            </span>
            <div className="min-w-0">
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
        </li>
    );
}

const STATUS_TONES: Record<
    "muted" | "info" | "success" | "warning",
    string
> = {
    muted:
        "border-border bg-muted text-muted-foreground",
    info:
        "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
    success:
        "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
    warning:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
};

function StatusItem({
    label,
    description,
    tone,
}: {
    label: string;
    description: string;
    tone: keyof typeof STATUS_TONES;
}) {
    return (
        <li className="rounded-lg border bg-card p-4">
            <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[tone]}`}
            >
                {label}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </li>
    );
}

function TipItem({ title, body }: { title: string; body: string }) {
    return (
        <li className="rounded-lg border bg-card p-4">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </li>
    );
}
