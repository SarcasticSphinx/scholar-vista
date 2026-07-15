/**
 * Public home page — `/`.
 *
 * Server-rendered landing surface (Req 4.1) composed of four major
 * sections, each populated from `lib/queries/*` so the page never falls
 * back to client-side fetching:
 *
 *   1. Hero — search input that submits to `/scholarships?q=...` and a
 *      primary CTA linking to the browse page (Req 4.2).
 *   2. Featured scholarships — up to 6 approved, sorted by `createdAt
 *      desc`, rendered with `ScholarshipCard` (Req 4.3).
 *   3. Platform stats — totals for approved scholarships, universities,
 *      and completed applications (Req 4.4).
 *   4. Partner universities — up to 6, rendered with `UniversityCard`
 *      (Req 4.5).
 *
 * All metadata is generated via `buildMetadata` so SEO, Open Graph, and
 * Twitter Card tags stay consistent (Req 4.7, 24.1, 24.6).
 *
 * Loading state lives in the sibling `loading.tsx` (Req 4.6); a database
 * failure surfaces through the sibling `error.tsx` (Req 4.8).
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    Award,
    Building2,
    GraduationCap,
    Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchAutocomplete } from "@/components/scholarship/search-autocomplete";
import { ScholarshipCard } from "@/components/scholarship/scholarship-card";
import { UniversityCard } from "@/components/university/university-card";
import { EmptyState } from "@/components/shared/empty-state";
import { featuredScholarships } from "@/lib/queries/scholarship";
import { partnerUniversities } from "@/lib/queries/university";
import { getPlatformStats } from "@/lib/queries/stats";
import { formatNumber } from "@/lib/intl";
import { buildMetadata } from "@/lib/seo";

/** Home page is statically generated and revalidated every 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
    title: "ScholarVista — Discover scholarships worldwide",
    description:
        "Search, compare, and apply for scholarships from universities around the world. Track applications, bookmark opportunities, and find your next step.",
    path: "/",
});

/**
 * Visible label for each platform statistic. Wrapping the large number in a
 * `<dl>` keeps the section semantic for screen readers.
 */
interface StatTile {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}

export default async function HomePage() {
    // Fetch all sections in parallel — the route segment cache + per-query
    // `unstable_cache` wrappers keep this cheap on warm renders.
    const [scholarships, universities, stats] = await Promise.all([
        featuredScholarships(6),
        partnerUniversities(6),
        getPlatformStats(),
    ]);

    const statTiles: StatTile[] = [
        {
            label: "Approved scholarships",
            value: stats.scholarships,
            icon: Award,
            description: "Active opportunities ready for application.",
        },
        {
            label: "Partner universities",
            value: stats.universities,
            icon: Building2,
            description: "Institutions across the globe on ScholarVista.",
        },
        {
            label: "Completed applications",
            value: stats.completedApplications,
            icon: GraduationCap,
            description: "Students placed through our platform.",
        },
    ];

    return (
        <>
            <HeroSection universities={universities} />

            <FeaturedSection scholarships={scholarships} />

            <StatsSection tiles={statTiles} />

            <PartnersSection universities={universities} />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function HeroSection({
    universities,
}: {
    universities: Awaited<ReturnType<typeof partnerUniversities>>;
}) {
    return (
        <section
            aria-labelledby="hero-heading"
            className="relative overflow-hidden border-b bg-secondary/40"
        >
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8 lg:py-24">
                <div className="flex flex-col items-start justify-center gap-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                        <Sparkles aria-hidden="true" className="size-3.5" />
                        Discover, compare, and apply
                    </span>

                    <h1
                        id="hero-heading"
                        className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                    >
                        Scholar
                        <span className="text-brand">Vista</span>
                        <span className="block text-3xl font-semibold text-foreground/80 sm:text-4xl lg:text-5xl">
                            Find the scholarship that fits your future.
                        </span>
                    </h1>

                    <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                        Search thousands of approved scholarships from universities
                        worldwide. Compare opportunities, track your applications, and
                        keep every option organized in one place.
                    </p>

                    <SearchAutocomplete
                        action="/scholarships"
                        placeholder="Try “engineering”, “Oxford”, or “PhD”…"
                        className="max-w-xl"
                        inputClassName="h-11 text-base"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                        <Button asChild size="lg" variant="default">
                            <Link href="/scholarships">
                                Browse all scholarships
                                <ArrowRight aria-hidden="true" className="ml-1 size-4" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href="/guide">Read the guide</Link>
                        </Button>
                    </div>
                </div>

                <div className="relative hidden lg:block">
                    <HeroUniversityStack universities={universities} />
                </div>
            </div>
        </section>
    );
}

/**
 * Fanned "photo stack" of partner universities shown in the hero.
 *
 * Renders up to four university logo cards, each slightly rotated and
 * offset so they overlap like a stack of photos. Cards are painted
 * back-to-front (last item furthest back) with the front card upright and
 * fully opaque. Purely decorative, so the whole cluster is hidden from
 * assistive tech via `aria-hidden` — the same universities are announced
 * semantically in the Partner universities section below.
 */
function HeroUniversityStack({
    universities,
}: {
    universities: Awaited<ReturnType<typeof partnerUniversities>>;
}) {
    const cards = universities.slice(0, 4);

    // Fallback to the previous single image if there are no partners to show.
    if (cards.length === 0) {
        return (
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border bg-card shadow-xl">
                <Image
                    src="https://picsum.photos/seed/scholarvista-hero/1200/1500"
                    alt="University graduates celebrating their commencement"
                    fill
                    priority
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                />
            </div>
        );
    }

    return (
        <div
            aria-hidden="true"
            className="relative mx-auto aspect-[4/5] w-full max-w-md"
        >
            {cards.map((university, index) => {
                // Front card (index 0) sits upright and centered; deeper cards
                // peek out to alternating sides with increasing rotation,
                // horizontal spread, and a slight downward drop.
                const side = index === 0 ? 0 : index % 2 === 1 ? -1 : 1;
                const rotate = side * (4 + index * 2);
                const translateX = side * (30 + index * 8);
                const translateY = index * 14;
                const scale = 1 - index * 0.04;

                return (
                    <div
                        key={university.id}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                            zIndex: cards.length - index,
                        }}
                    >
                        <div className="flex aspect-[4/5] w-4/5 flex-col overflow-hidden rounded-3xl border bg-card shadow-xl">
                            <div className="flex flex-1 items-center justify-center bg-white p-8">
                                {university.logo ? (
                                    <Image
                                        src={university.logo}
                                        alt=""
                                        width={220}
                                        height={220}
                                        priority={index === 0}
                                        sizes="220px"
                                        className="max-h-40 w-auto object-contain"
                                    />
                                ) : (
                                    <span className="flex size-28 items-center justify-center rounded-2xl bg-muted text-5xl font-semibold uppercase text-muted-foreground">
                                        {university.name.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div className="border-t bg-card px-5 py-4">
                                <p className="truncate font-serif text-base font-semibold text-foreground">
                                    {university.name}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {university.country}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Featured scholarships                                              */
/* ------------------------------------------------------------------ */

function FeaturedSection({
    scholarships,
}: {
    scholarships: Awaited<ReturnType<typeof featuredScholarships>>;
}) {
    return (
        <section
            aria-labelledby="featured-heading"
            className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-brand">
                        Featured
                    </p>
                    <h2
                        id="featured-heading"
                        className="text-3xl font-semibold tracking-tight sm:text-4xl"
                    >
                        Latest scholarships
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        The newest approved scholarships across every category. Save the
                        ones that fit and apply before the deadline.
                    </p>
                </div>
                <Button asChild variant="outline" size="sm" className="self-start sm:self-end">
                    <Link href="/scholarships">
                        View all
                        <ArrowRight aria-hidden="true" className="ml-1 size-4" />
                    </Link>
                </Button>
            </div>

            {scholarships.length > 0 ? (
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {scholarships.map((scholarship, idx) => (
                        <li key={scholarship.id} className="h-full">
                            <ScholarshipCard
                                scholarship={scholarship}
                                priority={idx < 3}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="No scholarships available yet"
                    description="Check back soon — new opportunities are added regularly."
                    icon={Award}
                    action={{ label: "Browse all", href: "/scholarships" }}
                />
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Platform stats                                                      */
/* ------------------------------------------------------------------ */

function StatsSection({ tiles }: { tiles: StatTile[] }) {
    return (
        <section
            aria-labelledby="stats-heading"
            className="border-y bg-muted/30"
        >
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="mb-8 max-w-2xl space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-brand">
                        By the numbers
                    </p>
                    <h2
                        id="stats-heading"
                        className="text-3xl font-semibold tracking-tight sm:text-4xl"
                    >
                        A growing scholarship community
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Real applicants, real institutions, real outcomes. Here&apos;s
                        what ScholarVista looks like today.
                    </p>
                </div>

                <dl className="grid gap-4 sm:grid-cols-3">
                    {tiles.map((tile) => (
                        <Card
                            key={tile.label}
                            className="transition-shadow hover:shadow-md"
                        >
                            <CardContent className="flex flex-col gap-3 p-6">
                                <span
                                    aria-hidden="true"
                                    className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand"
                                >
                                    <tile.icon className="size-5" />
                                </span>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    {tile.label}
                                </dt>
                                <dd className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                                    {formatNumber(tile.value)}
                                </dd>
                                <p className="text-sm text-muted-foreground">
                                    {tile.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </dl>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Partner universities                                                */
/* ------------------------------------------------------------------ */

function PartnersSection({
    universities,
}: {
    universities: Awaited<ReturnType<typeof partnerUniversities>>;
}) {
    return (
        <section
            aria-labelledby="partners-heading"
            className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-brand">
                        Partners
                    </p>
                    <h2
                        id="partners-heading"
                        className="text-3xl font-semibold tracking-tight sm:text-4xl"
                    >
                        Partner universities
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Institutions that work directly with ScholarVista to surface
                        their scholarships and streamline your applications.
                    </p>
                </div>
                <Button asChild variant="outline" size="sm" className="self-start sm:self-end">
                    <Link href="/universities">
                        Explore universities
                        <ArrowRight aria-hidden="true" className="ml-1 size-4" />
                    </Link>
                </Button>
            </div>

            {universities.length > 0 ? (
                <ul
                    role="list"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {universities.map((university, idx) => (
                        <li key={university.id} className="h-full">
                            <UniversityCard
                                university={university}
                                priority={idx < 3}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="No partner universities yet"
                    description="Universities will appear here as partnerships are confirmed."
                    icon={Building2}
                />
            )}
        </section>
    );
}
