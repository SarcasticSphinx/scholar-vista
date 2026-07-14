/**
 * Public Help (FAQ) page.
 *
 * Static, server-rendered Help page that satisfies Requirement 29.2:
 * - At minimum 5 FAQ entries with answers covering account management,
 *   scholarship applications, bookmarks, reviews, and payment processes.
 * - Heading-based sections with anchor IDs for direct linking (29.5).
 * - Server-side rendered for SEO (29.4) with `buildMetadata` populating
 *   title, description, canonical URL, OG, and Twitter Card tags (Req 24.1).
 * - Uses the shadcn `<Accordion>` primitive for collapsible Q&A. The
 *   accordion is a client island; the page itself remains a Server
 *   Component so the FAQ content is part of the initial HTML payload
 *   and indexable by crawlers.
 *
 * Validates: Requirements 29.2, 29.4, 29.5
 */

import type { Metadata } from "next";
import Link from "next/link";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Help & FAQ | ScholarVista",
    description:
        "Answers to common questions about accounts, scholarship applications, bookmarks, reviews, and payments on ScholarVista.",
    path: "/help",
});

interface FaqEntry {
    /** Slug used as anchor id for direct linking. */
    id: string;
    /** Section heading this entry belongs to. */
    section: string;
    question: string;
    /**
     * Answer rendered as paragraphs. Each string becomes a `<p>`.
     */
    answer: string[];
}

interface FaqSection {
    id: string;
    title: string;
    description: string;
    entries: FaqEntry[];
}

const FAQ_SECTIONS: FaqSection[] = [
    {
        id: "account-management",
        title: "Account management",
        description:
            "Sign up, sign in, recover your password, and keep your profile up to date.",
        entries: [
            {
                id: "faq-create-account",
                section: "Account management",
                question: "How do I create an account on ScholarVista?",
                answer: [
                    "Click the Sign up link in the top navigation, then choose email and password or continue with Google. You will receive a verification email; open it and click the link to activate your account.",
                    "Once verified, you can complete your profile from the dashboard, including your name, education level, country of residence, and an optional avatar.",
                ],
            },
            {
                id: "faq-sign-in",
                section: "Account management",
                question: "How do I sign in if I already have an account?",
                answer: [
                    "Use the Sign in link in the navigation. Enter the email and password you registered with, or use the Continue with Google button if you signed up via Google.",
                    "If you stay signed in, your session is preserved across visits on the same browser. You can sign out at any time from the user menu.",
                ],
            },
            {
                id: "faq-reset-password",
                section: "Account management",
                question: "I forgot my password. How do I reset it?",
                answer: [
                    "On the sign in page, click Forgot password and enter the email associated with your account. We will send a password reset link that is valid for a limited time.",
                    "Open the link, choose a new password (minimum 8 characters), and confirm it. You will be signed in automatically once the reset succeeds.",
                ],
            },
            {
                id: "faq-update-profile",
                section: "Account management",
                question: "How do I update my profile or change my email?",
                answer: [
                    "Open the user menu and choose Profile. From there you can update your display name, country, education level, and avatar. Changes save immediately.",
                    "Email changes require re-verification. After requesting a new email, watch your inbox for a confirmation message and click the link to complete the change.",
                ],
            },
        ],
    },
    {
        id: "scholarship-applications",
        title: "Scholarship applications",
        description:
            "Browse, filter, apply to scholarships, and track your application status.",
        entries: [
            {
                id: "faq-browse-scholarships",
                section: "Scholarship applications",
                question: "How do I browse and filter scholarships?",
                answer: [
                    "Visit the Scholarships page from the main navigation. Use the search bar to find scholarships by keyword, and use filters for country, education level, field of study, and deadline.",
                    "Results are paginated and can be sorted by deadline, amount, or newest. Click any card to open the scholarship detail page for full eligibility, requirements, and application instructions.",
                ],
            },
            {
                id: "faq-apply-scholarship",
                section: "Scholarship applications",
                question: "How do I apply to a scholarship?",
                answer: [
                    "Open a scholarship detail page and click Apply. You will be guided through a form that may request personal details, academic background, and supporting documents such as transcripts or essays.",
                    "Make sure to review eligibility requirements before applying. Once submitted, your application enters Pending status and appears in My Applications.",
                ],
            },
            {
                id: "faq-track-applications",
                section: "Scholarship applications",
                question: "How do I track the status of my applications?",
                answer: [
                    "Open the My Applications page from your dashboard. Each application shows the scholarship name, submission date, and current status: Pending, Under Review, Approved, or Rejected.",
                    "Status changes are visible in real time. When a decision is made, you will see updated status and any reviewer feedback attached to your application.",
                ],
            },
            {
                id: "faq-withdraw-application",
                section: "Scholarship applications",
                question: "Can I withdraw or edit an application after submitting?",
                answer: [
                    "Submitted applications cannot be edited to preserve fairness. You can withdraw a Pending application from the My Applications page, which removes you from consideration.",
                    "Once an application is Under Review, Approved, or Rejected it can no longer be withdrawn. Contact support if you believe this is in error.",
                ],
            },
        ],
    },
    {
        id: "bookmarks",
        title: "Bookmarks",
        description:
            "Save scholarships you are interested in and revisit them later.",
        entries: [
            {
                id: "faq-save-bookmark",
                section: "Bookmarks",
                question: "How do I save a scholarship as a bookmark?",
                answer: [
                    "Click the bookmark icon on any scholarship card or detail page. You must be signed in to save bookmarks; the icon will fill in to indicate the scholarship is saved.",
                    "You can bookmark as many scholarships as you like. Bookmarks are private to your account.",
                ],
            },
            {
                id: "faq-view-bookmarks",
                section: "Bookmarks",
                question: "Where can I see all my saved scholarships?",
                answer: [
                    "Open My Bookmarks from your dashboard or the user menu. The page lists every scholarship you have saved, with deadline, amount, and a quick link back to the detail page.",
                    "Bookmarks are sorted by most recently saved by default. You can use the same filters as the public listing to narrow your saved set.",
                ],
            },
            {
                id: "faq-remove-bookmark",
                section: "Bookmarks",
                question: "How do I remove a bookmark?",
                answer: [
                    "Click the bookmark icon again on the scholarship card or detail page to unsave it. The icon returns to its outlined state and the scholarship is removed from My Bookmarks immediately.",
                    "Removing a bookmark does not affect any application you have already submitted for that scholarship.",
                ],
            },
        ],
    },
    {
        id: "reviews",
        title: "Reviews",
        description:
            "Share your experience with a scholarship and read what others have written.",
        entries: [
            {
                id: "faq-leave-review",
                section: "Reviews",
                question: "How do I leave a review for a scholarship?",
                answer: [
                    "Open the scholarship detail page and scroll to the Reviews section. Click Write a review, choose a rating from 1 to 5 stars, and add a comment about your experience.",
                    "You must be signed in to write a review. Reviews are public and help other applicants make informed decisions.",
                ],
            },
            {
                id: "faq-one-review-per-scholarship",
                section: "Reviews",
                question: "Can I leave more than one review per scholarship?",
                answer: [
                    "No. Each user can leave one review per scholarship. This keeps ratings fair and prevents review spam.",
                    "If your opinion changes, you can edit your existing review or delete it and write a new one. The latest version always replaces the previous one.",
                ],
            },
            {
                id: "faq-edit-delete-review",
                section: "Reviews",
                question: "How do I edit or delete a review I wrote?",
                answer: [
                    "Open My Reviews from your dashboard or visit the scholarship page. Use the Edit or Delete action on your review. Edits update the review immediately and re-publish it.",
                    "Deleting a review is permanent and adjusts the average rating shown on the scholarship.",
                ],
            },
        ],
    },
    {
        id: "payments",
        title: "Payments",
        description:
            "Understand when fees apply, how to track payment status, and what happens with refunds.",
        entries: [
            {
                id: "faq-when-fees-apply",
                section: "Payments",
                question: "When do payment fees apply?",
                answer: [
                    "Most scholarships are free to apply for. A small number of scholarships may charge an application or processing fee, which is always shown clearly on the scholarship detail page before you submit.",
                    "ScholarVista does not charge for creating an account, browsing scholarships, bookmarking, or leaving reviews.",
                ],
            },
            {
                id: "faq-payment-status",
                section: "Payments",
                question: "How do I check the status of a payment?",
                answer: [
                    "Open the application linked to your payment from My Applications. The Payment section shows the current status: Pending, Completed, Failed, or Refunded, along with the transaction reference.",
                    "Status updates may take a few minutes after you complete checkout. Refresh the page if a payment is still showing Pending after several minutes.",
                ],
            },
            {
                id: "faq-refunds",
                section: "Payments",
                question: "How do refunds work?",
                answer: [
                    "If a scholarship is cancelled or you are eligible for a refund, the original charge is reversed to the same payment method you used at checkout. Refunds typically appear within 5 to 10 business days, depending on your bank.",
                    "Once a refund is issued, the application's payment status is set to Refunded. If you have not received a refund after 10 business days, contact support with your transaction reference.",
                ],
            },
        ],
    },
];

const CONTACT = {
    email: "support@scholarvista.example",
    twitter: "@scholarvista",
    twitterUrl: "https://twitter.com/scholarvista",
} as const;

export default function HelpPage() {
    return (
        <div className="container py-10 md:py-16">
            <header className="max-w-3xl section-break">
                <p className="text-sm font-medium text-primary">Help center</p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
                    Help & frequently asked questions
                </h1>
                <p className="mt-4 text-muted-foreground">
                    Quick answers to common questions about ScholarVista. Use the
                    shortcuts below to jump to a section, or scroll to read everything.
                </p>
            </header>

            <nav
                aria-label="FAQ sections"
                className="section-break rounded-lg border bg-card p-4 md:p-6"
            >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    On this page
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {FAQ_SECTIONS.map((section) => (
                        <li key={section.id}>
                            <Link
                                href={`#${section.id}`}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                {section.title}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link
                            href="#contact"
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Contact us
                        </Link>
                    </li>
                </ul>
            </nav>

            <div className="space-y-12">
                {FAQ_SECTIONS.map((section) => (
                    <section
                        key={section.id}
                        id={section.id}
                        aria-labelledby={`${section.id}-title`}
                        className="scroll-mt-24"
                    >
                        <h2
                            id={`${section.id}-title`}
                            className="text-2xl font-semibold tracking-tight"
                        >
                            {section.title}
                        </h2>
                        <p className="mt-2 text-muted-foreground">{section.description}</p>

                        <Accordion
                            type="multiple"
                            className="mt-6 rounded-lg border bg-card px-4"
                        >
                            {section.entries.map((entry) => (
                                <AccordionItem
                                    key={entry.id}
                                    value={entry.id}
                                    id={entry.id}
                                    className="scroll-mt-24"
                                >
                                    <AccordionTrigger className="text-base font-medium">
                                        {entry.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-muted-foreground">
                                        {entry.answer.map((paragraph, idx) => (
                                            <p key={idx}>{paragraph}</p>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </section>
                ))}

                <section
                    id="contact"
                    aria-labelledby="contact-title"
                    className="scroll-mt-24 rounded-lg border bg-card p-6 md:p-8"
                >
                    <h2 id="contact-title" className="text-2xl font-semibold tracking-tight">
                        Still need help? Contact us
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                        We are happy to help with anything not covered above. The fastest
                        way to reach us is by email; we typically respond within one
                        business day.
                    </p>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-semibold text-foreground">Email</dt>
                            <dd className="mt-1">
                                <a
                                    href={`mailto:${CONTACT.email}`}
                                    className="text-primary hover:underline"
                                >
                                    {CONTACT.email}
                                </a>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-semibold text-foreground">Twitter</dt>
                            <dd className="mt-1">
                                <a
                                    href={CONTACT.twitterUrl}
                                    className="text-primary hover:underline"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    {CONTACT.twitter}
                                </a>
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>
        </div>
    );
}
