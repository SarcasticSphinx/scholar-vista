"use client";

/**
 * Root route-segment error boundary.
 *
 * Next.js renders this client component whenever an unhandled exception is
 * thrown while rendering a route segment that isn't covered by a more
 * specific `error.tsx` (e.g. `app/(public)/error.tsx`). It receives the
 * thrown `error` (with an optional `digest` for server-side correlation) and
 * a `reset()` callback that re-attempts rendering the failed segment.
 *
 * The page presents an on-brand recovery card with two actions:
 *  - a primary "Try again" control wired to `reset()`, and
 *  - a secondary link back to the home page.
 *
 * Validates: Requirement 28.2 (custom error boundary with retry + home link),
 * Requirement 25.7 (failed segment recovers without crashing the page).
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surface the failure for observability; production deployments typically
    // forward console errors to their logging/monitoring pipeline.
    console.error("Unexpected application error:", error);
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
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while loading this page. This is
              usually temporary — please try again, or head back to the home
              page.
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
              Try again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Home aria-hidden="true" className="size-4" />
                Go home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
