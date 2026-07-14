"use client";

/**
 * Top-level (root) error boundary.
 *
 * Next.js renders `global-error.tsx` only when an error is thrown in the root
 * layout itself — the failure that `app/error.tsx` cannot catch. Because it
 * replaces the root layout, this component MUST render its own `<html>` and
 * `<body>` tags. We import the global stylesheet directly so Tailwind
 * utilities and design tokens are available even though the root layout never
 * mounted.
 *
 * Like the segment boundary, it exposes a primary "Try again" control wired to
 * `reset()` and a secondary link back to the home page.
 *
 * Validates: Requirement 28.2 (root error boundary with retry + home link).
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // The root layout failed to render; log for observability.
    console.error("Critical application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <section
          role="alert"
          aria-live="assertive"
          className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8"
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
                  A critical error occurred and the page couldn&apos;t be
                  displayed. Please try again, or return to the home page.
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
      </body>
    </html>
  );
}
