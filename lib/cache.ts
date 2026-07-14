import { unstable_cache } from "next/cache";

/**
 * Cache tag registry for tag-based cache invalidation.
 *
 * Server Actions invoke `revalidateTag(CACHE_TAGS.scholarshipList)` (or
 * `revalidateTag(CACHE_TAGS.scholarshipDetail(id))`) after mutations so that
 * dependent server-rendered pages refetch on next request.
 *
 * Source of truth: design.md "Data Fetching & Caching" section.
 */
export const CACHE_TAGS = {
  scholarshipList: "scholarship-list",
  scholarshipDetail: (id: string) => `scholarship:${id}`,
  universityList: "university-list",
  homeStats: "home-stats",
  partnerUnis: "partner-universities",
  sitemap: "sitemap",
} as const;

/**
 * Default revalidation windows (in seconds) for cached public-catalog queries.
 *
 * Values come directly from design.md and Requirement 25.5:
 * - `scholarshipList`: 60 s
 * - `universityList`: 300 s
 * - `homeStats`: 120 s
 */
export const REVALIDATE = {
  scholarshipList: 60, // Req 25.5
  universityList: 300, // Req 25.5
  homeStats: 120,
} as const;

/**
 * Thin wrapper around Next.js's `unstable_cache` that captures the standard
 * `(fn, key, opts)` signature used across the query layer.
 *
 * Example:
 * ```ts
 * export const listScholarships = cached(
 *   (filters: Filters) => prisma.scholarship.findMany({ where: ... }),
 *   ["scholarships", "list"],
 *   { tags: [CACHE_TAGS.scholarshipList], revalidate: REVALIDATE.scholarshipList }
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cached = <T extends (...a: any[]) => any>(
  fn: T,
  key: string[],
  opts: { tags?: string[]; revalidate?: number },
) => unstable_cache(fn, key, opts);
