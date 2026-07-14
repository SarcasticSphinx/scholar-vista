"use client";

/**
 * Error boundary for the public home page.
 *
 * Activated when any of the data-fetching queries on the home route
 * (`featuredScholarships`, `partnerUniversities`, `getPlatformStats`)
 * throws — typically when the database is unreachable. Renders a polite
 * recovery card with a primary "Retry" action that calls `reset()` to
 * re-attempt the segment, and a secondary action to return to the home
 * page (which itself triggers a retry on this segment).
 *
 * Validates: Requirement 4.8 (database-unavailable error path with retry).
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HomeErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function HomeError({ error, reset }: HomeErrorProps) {
    useEffect(() => {
        // Surface the failure to the browser console for observability;
        // production deployments typically forward this to their logger.
        console.error("Home page failed to load:", error);
    }, [error]);

    return (
        <section
            role="alert"
            aria-live="assertive"
            className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8"
        >
            <Card className="w-full">
                <CardContent className="flex flex-col items-center gap-5 p-8 sm:p-10">
                    <span
                        aria-hidden="true"
                        className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                    >
                        <AlertTriangle className="size-7" />
                    </span>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            We couldn&apos;t load the home page
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Something went wrong while loading scholarships and
                            universities. This is usually temporary — please try again
                            in a moment.
                        </p>
                        {error.digest ? (
                            <p className="font-mono text-xs text-muted-foreground/70">
                                Reference: {error.digest}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button onClick={reset} size="lg">
                            <RotateCw aria-hidden="true" className="size-4" />
                            Retry
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/scholarships">Browse scholarships</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
