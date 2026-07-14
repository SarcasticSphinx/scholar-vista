/**
 * Administration Help page — `/dashboard/help`.
 *
 * Server-rendered guide for administrators and moderators covering the
 * four core management workflows on the platform:
 *
 *   - Scholarship management   (anchor: `#scholarship-management`)
 *   - University management    (anchor: `#university-management`)
 *   - Application processing   (anchor: `#application-processing`)
 *   - User role management     (anchor: `#user-role-management`)
 *
 * Content is organized into sectioned cards with semantic headings and
 * per-section anchor IDs (Req 29.5). Each section uses the shadcn
 * `<Accordion>` primitive for collapsible task-by-task guidance; the
 * accordion is a small client island while the page itself remains a
 * Server Component so the guide content ships in the initial HTML
 * payload and is rendered server-side (Req 29.4).
 *
 * Gating: the parent `(dashboard)/layout.tsx` already restricts the tree
 * to `ADMIN` / `MODERATOR` via `requireRole`, so no additional guard is
 * needed here.
 *
 * Validates: Requirements 29.3
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
    GraduationCap,
    Building2,
    FileText,
    Users,
    type LucideIcon,
} from "lucide-react";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Administration Help | ScholarVista",
    description:
        "Guides for managing scholarships, universities, applications, and user roles in the ScholarVista dashboard.",
    path: "/dashboard/help",
});

/** A single collapsible how-to entry within a guide section. */
interface GuideEntry {
    /** Slug used as the anchor id for direct linking. */
    id: string;
    /** Short task title shown on the accordion trigger. */
    title: string;
    /** Answer rendered as paragraphs. Each string becomes a `<p>`. */
    body: string[];
}

/** A top-level guide section, rendered as a sectioned card. */
interface GuideSection {
    /** Slug used as the section anchor id and `aria-labelledby` target. */
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    entries: GuideEntry[];
}

const GUIDE_SECTIONS: readonly GuideSection[] = [
    {
        id: "scholarship-management",
        title: "Scholarship management",
        description:
            "Create, edit, delete, and approve scholarships so platform listings stay accurate and trustworthy.",
        icon: GraduationCap,
        entries: [
            {
                id: "scholarship-create",
                title: "Creating a scholarship",
                body: [
                    "Open Scholarships from the sidebar and choose New scholarship. Fill in the required fields: title, university, category, subject, description, stipend, coverage, location, requirements, deadline, application link, and fees.",
                    "Every field is validated before submission. If a value is missing or out of range, an inline error appears next to that field and the form will not submit until it is corrected. On success you will see a confirmation toast and the new scholarship appears in the list.",
                ],
            },
            {
                id: "scholarship-edit",
                title: "Editing a scholarship",
                body: [
                    "From the scholarship list, open the row's actions and choose Edit. The form is pre-populated with the current values for every editable field, so you only need to change what is out of date.",
                    "The same validation rules apply as when creating. Saving updates the record and refreshes the list with a success toast.",
                ],
            },
            {
                id: "scholarship-delete",
                title: "Deleting a scholarship",
                body: [
                    "Choose Delete on a scholarship to start removal. A confirmation prompt appears first so you do not delete by accident.",
                    "Confirming is permanent: it removes the scholarship along with all of its associated reviews, bookmarks, and applications. Only delete when you are sure the listing should be gone for good.",
                ],
            },
            {
                id: "scholarship-approve",
                title: "Approving or rejecting submissions",
                body: [
                    "User-submitted scholarships start unapproved and stay hidden from the public until reviewed. To approve one, set its approval status so isApproved becomes true; it then becomes visible in public listings and the sitemap.",
                    "To reject a submission, delete the scholarship record. Use the approval status filter on the scholarship list to find everything still pending review.",
                ],
            },
        ],
    },
    {
        id: "university-management",
        title: "University management",
        description:
            "Maintain institutional profiles and control whether each university is accepting applications.",
        icon: Building2,
        entries: [
            {
                id: "university-create",
                title: "Creating a university",
                body: [
                    "Open Universities from the sidebar and choose New university. Provide the name, logo (uploaded via the image service), contact email, website, country, city, world rank, type, and established year.",
                    "Fields are validated on submit — for example, the established year must fall between 1000 and the current year. Any invalid field shows an inline error and blocks submission until fixed.",
                ],
            },
            {
                id: "university-edit",
                title: "Editing a university",
                body: [
                    "Choose Edit on a university to open its form pre-populated with current values for every field. Update what has changed and save.",
                    "Use the search box to filter the list by university name or country when you need to locate a specific institution quickly.",
                ],
            },
            {
                id: "university-delete",
                title: "Deleting a university",
                body: [
                    "Choose Delete to remove a university. If the university has associated scholarships, the confirmation prompt tells you exactly how many will be affected before you proceed.",
                    "Confirming deletion removes the university and all of its associated scholarship records. Review the associated count carefully, since this cascade cannot be undone.",
                ],
            },
            {
                id: "university-accepting-applications",
                title: "Toggling accepting applications",
                body: [
                    "Each university has an accepting-applications switch. Toggle it to open or close the university to new applications without deleting or hiding the profile.",
                    "The change is persisted immediately. Turning it off is a quick way to pause intake for an institution while keeping its listing and existing data intact.",
                ],
            },
        ],
    },
    {
        id: "application-processing",
        title: "Application processing",
        description:
            "Review applicant submissions, move them through the status workflow, and share decision feedback.",
        icon: FileText,
        entries: [
            {
                id: "application-review",
                title: "Reviewing applications",
                body: [
                    "Open Applications from the sidebar to see a paginated list. Each detail view shows the applicant's name, phone number, gender, applying degree, SSC and HSC results, subject category, and address, along with the associated scholarship title and deadline.",
                    "Filter by status, scholarship, or applicant name to focus your queue on the records you need to act on.",
                ],
            },
            {
                id: "application-status-workflow",
                title: "Status workflow and allowed transitions",
                body: [
                    "Applications follow a fixed status workflow: PENDING → PROCESSING, then PROCESSING → COMPLETED or PROCESSING → REJECTED. These are the only transitions the system permits.",
                    "Because the workflow is one-directional, you cannot skip PROCESSING or reopen a finished application. Move a new application to PROCESSING when you begin review, then set COMPLETED or REJECTED once a decision is made.",
                ],
            },
            {
                id: "application-feedback",
                title: "Providing feedback",
                body: [
                    "When you update an application's status you can attach optional feedback of up to 1000 characters explaining the decision.",
                    "Feedback you save is shown to the applicant alongside their application on the My Applied Scholarships page, so keep it clear and constructive.",
                ],
            },
            {
                id: "application-errors",
                title: "When a status update fails",
                body: [
                    "If an update cannot be saved, the dashboard shows an error notification and the application keeps its previous status — nothing is partially applied.",
                    "Re-check the attempted transition against the allowed workflow, then retry. If the failure persists, the underlying record may have changed; refresh the list and try again.",
                ],
            },
        ],
    },
    {
        id: "user-role-management",
        title: "User role management",
        description:
            "Assign roles to control access. Only administrators can manage users and roles.",
        icon: Users,
        entries: [
            {
                id: "user-roles-overview",
                title: "Understanding the roles",
                body: [
                    "There are three roles. USER covers personal features such as applications, bookmarks, profile, and reviews. MODERATOR adds access to the dashboard for content management. ADMIN has full access, including user management and platform settings.",
                    "Grant the least privilege needed: promote trusted helpers to MODERATOR for day-to-day content work, and reserve ADMIN for people who must manage users and configuration.",
                ],
            },
            {
                id: "user-find",
                title: "Finding users",
                body: [
                    "Open Users from the sidebar for a paginated list (10 per page) searchable by name or email. Each row shows the user's name, email, role, and registration date.",
                    "Opening a user reveals more detail, including registration date, current role, applied scholarships count, and bookmarks count.",
                ],
            },
            {
                id: "user-change-role",
                title: "Changing a user's role",
                body: [
                    "From a user's record, change their role between USER, MODERATOR, and ADMIN. The change is persisted within the same request and the updated record is returned, so the new role takes effect right away.",
                    "If a role update fails due to a database or validation error, the dashboard reports that the role was not changed and keeps the previous role shown in the interface.",
                ],
            },
            {
                id: "user-self-change-restriction",
                title: "Self-change restriction",
                body: [
                    "You cannot change your own role. This safeguard prevents an administrator from accidentally removing their own access and locking the platform out of administration.",
                    "If your role genuinely needs to change, ask another administrator to make the update for you.",
                ],
            },
        ],
    },
] as const;

export default function AdminHelpPage() {
    return (
        <div className="mx-auto w-full max-w-5xl">
            {/* Page header */}
            <header className="max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-wider text-brand">
                    Administration help
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                    Dashboard management guides
                </h1>
                <p className="mt-4 text-muted-foreground">
                    Step-by-step guidance for managing scholarships, universities,
                    applications, and user roles. Jump to a section below, or scroll to
                    read everything.
                </p>
            </header>

            {/* In-page table of contents */}
            <nav
                aria-label="Help sections"
                className="mt-8 rounded-lg border bg-card p-4 md:p-6"
            >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    On this page
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {GUIDE_SECTIONS.map((section) => (
                        <li key={section.id}>
                            <Link
                                href={`#${section.id}`}
                                className="text-sm font-medium text-brand hover:underline"
                            >
                                {section.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Guide sections */}
            <div className="mt-10 space-y-8">
                {GUIDE_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                        <section
                            key={section.id}
                            id={section.id}
                            aria-labelledby={`${section.id}-title`}
                            className="scroll-mt-24"
                        >
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start gap-4">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand/10 text-brand"
                                        >
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h2
                                                id={`${section.id}-title`}
                                                className="text-2xl font-semibold tracking-tight"
                                            >
                                                <a
                                                    href={`#${section.id}`}
                                                    className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    {section.title}
                                                </a>
                                            </h2>
                                            <p className="mt-1 text-muted-foreground">
                                                {section.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="multiple" className="w-full">
                                        {section.entries.map((entry) => (
                                            <AccordionItem
                                                key={entry.id}
                                                value={entry.id}
                                                id={entry.id}
                                                className="scroll-mt-24"
                                            >
                                                <AccordionTrigger className="text-base font-medium">
                                                    {entry.title}
                                                </AccordionTrigger>
                                                <AccordionContent className="space-y-3 text-muted-foreground">
                                                    {entry.body.map((paragraph, idx) => (
                                                        <p key={idx}>{paragraph}</p>
                                                    ))}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
