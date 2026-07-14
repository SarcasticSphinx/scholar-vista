/**
 * Custom 404 for the scholarship detail route.
 *
 * Triggered when the requested scholarship doesn't exist or is not
 * approved (and the viewer is neither the owner nor an admin/moderator),
 * via `notFound()` in `page.tsx` (Req 6.9).
 *
 * Server component — no client-side state is needed for this static
 * surface, so the page stays inside the public route group's layout.
 */

import Link from "next/link";
import { GraduationCap, Home, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ScholarshipNotFound() {
    return (
        <section
            aria-labelledby="scholarship-not-found-heading"
            className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8"
        >
            <span
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
                <SearchX className="size-8" />
            </span>

            <h1
                id="scholarship-not-found-heading"
                className="mt-6 text-3xl font-semibold tracking-tight"
            >
                Scholarship not found
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
                The scholarship you&apos;re looking for doesn&apos;t exist, has been
                removed, or is not yet approved for public viewing.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                    <Link href="/scholarships">
                        <GraduationCap aria-hidden="true" className="size-4" />
                        Browse scholarships
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/">
                        <Home aria-hidden="true" className="size-4" />
                        Go home
                    </Link>
                </Button>
            </div>
        </section>
    );
}
