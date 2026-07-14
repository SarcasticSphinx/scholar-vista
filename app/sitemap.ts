/**
 * Dynamic sitemap (`app/sitemap.ts`).
 *
 * Implements Next.js's `MetadataRoute.Sitemap` convention. Next.js serves the
 * generated array as `/sitemap.xml`.
 *
 * Contents (per Requirement 24.2 and design.md "SEO"):
 *   - One entry per `isApproved=true` scholarship detail page
 *     (`/scholarships/[id]`).
 *   - One entry per university detail page (`/universities/[id]`).
 *   - The static public pages: `/`, `/scholarships`, `/universities`,
 *     `/guide`, `/help`.
 *
 * Unapproved scholarships and authenticated routes are intentionally excluded.
 *
 * Data access
 * -----------
 * The dynamic rows come from the shared query layer
 * (`approvedScholarshipsForSitemap`, `universitiesForSitemap`) rather than a
 * direct Prisma call, so the sitemap reuses the same DTO seam as the rest of
 * the app and inherits its caching.
 *
 * Revalidation
 * ------------
 * Both query helpers are cached on `CACHE_TAGS.sitemap` (`'sitemap'`).
 * Mutations that change the set of approved scholarships (approval / removal)
 * call `revalidateTag(CACHE_TAGS.sitemap)` so the sitemap is regenerated. See
 * `lib/cache.ts#CACHE_TAGS.sitemap` and the approval Server Actions in
 * `actions/scholarship.ts`.
 *
 * Base URL
 * --------
 * `NEXT_PUBLIC_APP_URL` is read from the validated `env` module (`lib/env.ts`)
 * and normalised to drop any trailing slash.
 *
 * Validates: Requirements 24.2.
 */

import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { approvedScholarshipsForSitemap } from "@/lib/queries/scholarship";
import { universitiesForSitemap } from "@/lib/queries/university";

// Force dynamic so the sitemap is generated at request time, not build time.
// This prevents build failures when the database is not available.
export const dynamic = "force-dynamic";

/** Static public pages crawlers should always see (relative paths). */
const STATIC_PUBLIC_PATHS = [
  "/",
  "/scholarships",
  "/universities",
  "/guide",
  "/help",
] as const;

/** Read and normalize the configured public base URL (no trailing slash). */
function getBaseUrl(): string {
  return (env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  // Reuse the shared query helpers; both are tagged `'sitemap'` so an
  // approval/removal `revalidateTag('sitemap')` regenerates this route.
  const [scholarships, universities] = await Promise.all([
    approvedScholarshipsForSitemap(),
    universitiesForSitemap(),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_PATHS.map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
    }),
  );

  const scholarshipEntries: MetadataRoute.Sitemap = scholarships.map((s) => ({
    url: `${base}/scholarships/${s.id}`,
    lastModified: s.updatedAt,
  }));

  const universityEntries: MetadataRoute.Sitemap = universities.map((u) => ({
    url: `${base}/universities/${u.id}`,
    lastModified: u.updatedAt,
  }));

  return [...staticEntries, ...scholarshipEntries, ...universityEntries];
}
