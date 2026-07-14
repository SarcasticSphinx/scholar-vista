/**
 * University detail page.
 *
 * Server-rendered page that displays the full university profile alongside
 * a paginated list of approved scholarships offered by the institution
 * (Req 14.1, 14.2). Returns `notFound()` when the `id` does not match a
 * record so Next renders the platform 404 (Req 14.4).
 *
 * URL contract:
 *   - dynamic segment `[id]` — university primary key.
 *   - `?page=` — pagination cursor for the scholarships list (≤10 / page).
 *
 * SEO:
 *   - `generateMetadata` returns title/description/OG tags built around
 *     the university name (Req 14.3, 24.1).
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    Building2,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    Globe2,
    GraduationCap,
    MapPin,
    Trophy,
    XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ScholarshipCard } from "@/components/scholarship/scholarship-card";
import { getUniversityById } from "@/lib/queries/university";
import { scholarshipsByUniversity } from "@/lib/queries/scholarship";
import { buildMetadata } from "@/lib/seo";

/** Detail pages opt into ISR (per design.md §"Caching strategy"). */
export const revalidate = 60;

const SCHOLARSHIPS_PAGE_SIZE = 10;

interface UniversityDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Coerce `searchParams[key]` into a single string (drops arrays/undefined). */
function firstParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
}

/** Parse the `page` URL param to a positive integer, defaulting to 1. */
function parsePage(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return parsed;
}

/** Format `PUBLIC` / `PRIVATE` enums as `"Public"` / `"Private"`. */
function typeLabel(type: string): string {
    return type
        .toString()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const university = await getUniversityById(id);
    if (!university) {
        return buildMetadata({
            title: "University not found | ScholarVista",
            description: "The requested university could not be found.",
            path: `/universities/${id}`,
        });
    }
    return buildMetadata({
        title: `${university.name} | ScholarVista`,
        description:
            university.description ||
            `Learn about ${university.name} in ${university.city}, ${university.country} and the scholarships it offers.`,
        path: `/universities/${university.id}`,
        image: university.logo ?? undefined,
    });
}

export default async function UniversityDetailPage({
    params,
    searchParams,
}: UniversityDetailPageProps) {
    const [{ id }, sp] = await Promise.all([params, searchParams]);

    const university = await getUniversityById(id);
    if (!university) notFound();

    const page = parsePage(firstParam(sp.page));
    const scholarships = await scholarshipsByUniversity(
        university.id,
        page,
        SCHOLARSHIPS_PAGE_SIZE,
    );

    const headingId = `university-${university.id}-heading`;
    const scholarshipsHeadingId = `university-${university.id}-scholarships`;

    return (
        <article
            aria-labelledby={headingId}
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
            {/* ---------------------------------------------------------------
            Hero block — name, logo, location, world rank, type, partnership
            --------------------------------------------------------------- */}
            <header className="mb-8 flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:flex-row md:items-center">
                {university.logo ? (
                    <Image
                        src={university.logo}
                        alt={`${university.name} logo`}
                        width={128}
                        height={128}
                        priority
                        sizes="128px"
                        className="size-24 shrink-0 rounded-lg bg-background object-contain ring-1 ring-border md:size-32"
                    />
                ) : (
                    <span
                        aria-hidden="true"
                        className="flex size-24 shrink-0 items-center justify-center rounded-lg bg-muted text-3xl font-semibold uppercase text-muted-foreground ring-1 ring-border md:size-32"
                    >
                        {university.name.charAt(0)}
                    </span>
                )}

                <div className="min-w-0 flex-1 space-y-3">
                    <h1
                        id={headingId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        {university.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin aria-hidden="true" className="size-4" />
                            {university.city}, {university.country}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Trophy aria-hidden="true" className="size-4" />
                            World rank #{university.worldRank}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Building2 aria-hidden="true" className="size-4" />
                            {typeLabel(university.type)} institution
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays aria-hidden="true" className="size-4" />
                            Established {university.establishedYear}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {university.isPartner ? (
                            <Badge
                                variant="default"
                                className="gap-1"
                                aria-label="Partner university"
                            >
                                <CheckCircle2 aria-hidden="true" className="size-3" />
                                Partner university
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="gap-1 text-muted-foreground"
                                aria-label="Not a partner university"
                            >
                                <XCircle aria-hidden="true" className="size-3" />
                                Not a partner
                            </Badge>
                        )}
                        {university.acceptingApplications ? (
                            <Badge variant="secondary">Accepting applications</Badge>
                        ) : null}
                    </div>
                </div>

                {university.website ? (
                    <Button asChild className="md:self-start" variant="outline">
                        <a
                            href={university.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${university.name} website (opens in new tab)`}
                        >
                            <Globe2 aria-hidden="true" className="size-4" />
                            Visit website
                            <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                    </Button>
                ) : null}
            </header>

            {/* ---------------------------------------------------------------
            About + factsheet
            --------------------------------------------------------------- */}
            <section
                aria-label="About"
                className="grid gap-6 lg:grid-cols-3"
            >
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <h2 className="text-xl font-semibold tracking-tight">
                            About {university.name}
                        </h2>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                            {university.description ||
                                "No description has been provided for this university yet."}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Factsheet
                        </h2>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Country
                                </dt>
                                <dd className="font-medium">{university.country}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    City
                                </dt>
                                <dd className="font-medium">{university.city}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    World rank
                                </dt>
                                <dd className="font-medium">
                                    #{university.worldRank}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Type
                                </dt>
                                <dd className="font-medium">
                                    {typeLabel(university.type)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Established
                                </dt>
                                <dd className="font-medium">
                                    {university.establishedYear}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Partner status
                                </dt>
                                <dd className="font-medium">
                                    {university.isPartner ? "Partner" : "Non-partner"}
                                </dd>
                            </div>
                            {university.website ? (
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Website
                                    </dt>
                                    <dd className="break-words font-medium">
                                        <Link
                                            href={university.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline-offset-4 hover:underline"
                                        >
                                            {university.website}
                                        </Link>
                                    </dd>
                                </div>
                            ) : null}
                        </dl>
                    </CardContent>
                </Card>
            </section>

            {/* ---------------------------------------------------------------
            Scholarships offered (≤10 / page, deadline asc)
            --------------------------------------------------------------- */}
            <section
                aria-labelledby={scholarshipsHeadingId}
                className="mt-12"
            >
                <header className="mb-4 flex items-center justify-between gap-3">
                    <h2
                        id={scholarshipsHeadingId}
                        className="text-2xl font-semibold tracking-tight"
                    >
                        Scholarships at {university.name}
                    </h2>
                    {scholarships.total > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {scholarships.total} scholarship
                            {scholarships.total === 1 ? "" : "s"} available
                        </p>
                    ) : null}
                </header>

                {scholarships.items.length > 0 ? (
                    <ul
                        role="list"
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {scholarships.items.map((scholarship) => (
                            <li key={scholarship.id} className="h-full">
                                <ScholarshipCard scholarship={scholarship} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        title="No scholarships listed yet"
                        description={`${university.name} hasn't posted any approved scholarships at the moment. Check back soon.`}
                        icon={GraduationCap}
                        action={{
                            label: "Browse all scholarships",
                            href: "/scholarships",
                        }}
                    />
                )}

                {scholarships.totalPages > 1 ? (
                    <div className="mt-8">
                        <Pagination
                            currentPage={scholarships.page}
                            totalPages={scholarships.totalPages}
                            baseUrl={`/universities/${university.id}`}
                        />
                    </div>
                ) : null}
            </section>
        </article>
    );
}
