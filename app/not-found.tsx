/**
 * Root custom 404 page.
 *
 * Rendered by Next.js for unmatched routes and for any `notFound()` call
 * (e.g. a missing or unapproved scholarship/university detail page). This is
 * a Server Component — it ships no client JS and simply presents a message
 * and a link back to the home page.
 *
 * Validates: Requirement 28.1 (custom 404 with not-found message + home link).
 */

import Link from "next/link";
import { Home, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <section
      role="alert"
      className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8"
    >
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-5 p-8 sm:p-10">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <SearchX className="size-7" />
          </span>

          <div className="space-y-2">
            <p className="text-5xl font-bold tracking-tight">404</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Page not found
            </h1>
            <p className="text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has
              been moved. Check the address or head back to the home page.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/">
              <Home aria-hidden="true" className="size-4" />
              Go home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
