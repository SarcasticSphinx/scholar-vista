/**
 * University read-side queries.
 *
 * Public surface:
 *   - `listUniversities({ search, page, pageSize })` — paginated, optionally
 *     filtered listing for the public universities page (Req 13.1, 13.4) and
 *     admin university management list (Req 18.1).
 *   - `partnerUniversities(limit = 6)` — partner-universities slot on the
 *     home page (Req 4.5).
 *   - `getUniversityById(id)` — full record lookup for the university detail
 *     page and admin edit form (Req 14.1, 18.3).
 *
 * Caching strategy
 * ----------------
 * `partnerUniversities` and `listUniversities` are wrapped with
 * `unstable_cache` via `cached()` so server-rendered listings deduplicate
 * database hits inside Next.js's data cache. Both reads are tagged with
 * `CACHE_TAGS.universityList` and `partnerUniversities` is additionally
 * tagged with `CACHE_TAGS.partnerUnis`, allowing Server Actions that mutate
 * universities (create/update/delete or partner toggle) to invalidate the
 * dependent listings precisely via `revalidateTag`.
 *
 * `getUniversityById` is left uncached at this layer because the detail
 * page enables ISR via `revalidate = 60` on the route segment; double
 * caching would only complicate invalidation.
 *
 * Validates: Requirements 4.5, 13.1, 13.4, 18.1.
 */

import { Prisma } from "@/generated/prisma/client";

import { CACHE_TAGS, REVALIDATE, cached } from "@/lib/cache";
import prisma from "@/lib/prisma";
import {
  toUniversityCard,
  toUniversityDTO,
} from "@/lib/queries/_mappers";
import {
  type PageResult,
  type UniversityCardDTO,
  type UniversityDTO,
  clampPage,
  totalPagesOf,
} from "@/lib/queries/dto";

/** Default page size for the universities listing (Req 13.1). */
const DEFAULT_PAGE_SIZE = 12;

/** Standard `select` mirroring `UniversityCardDTO`. */
const universityCardSelect = {
  id: true,
  name: true,
  logo: true,
  country: true,
  city: true,
  worldRank: true,
  type: true,
  isPartner: true,
} as const satisfies Prisma.UniversitySelect;

/** Inputs accepted by {@link listUniversities}. */
export interface ListUniversitiesParams {
  /** Optional case-insensitive search applied to `name` OR `country`. */
  search?: string;
  /** 1-indexed page number; clamped to `[1, totalPages]`. */
  page?: number;
  /** Page size; defaults to 12 (Req 13.1). */
  pageSize?: number;
}

/**
 * Build the Prisma `where` clause for the universities listing.
 *
 * Search of length ≥ 1 (callers also enforce ≥ 2 at the URL layer per
 * Req 13.4) is applied case-insensitively against `name` and `country` via
 * an `OR`. An empty/undefined search returns the unfiltered set.
 */
function buildWhere(search: string | undefined): Prisma.UniversityWhereInput {
  const trimmed = search?.trim();
  if (!trimmed) return {};
  return {
    OR: [
      { name: { contains: trimmed, mode: "insensitive" } },
      { country: { contains: trimmed, mode: "insensitive" } },
    ],
  };
}

/**
 * Implementation of {@link listUniversities}. Extracted so that
 * `unstable_cache` receives a stable function reference and the cache key
 * is derived from a single normalized argument list.
 */
async function listUniversitiesImpl(
  search: string | undefined,
  page: number,
  pageSize: number,
): Promise<PageResult<UniversityCardDTO>> {
  const where = buildWhere(search);
  const total = await prisma.university.count({ where });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(page, totalPages);

  const rows = await prisma.university.findMany({
    where,
    orderBy: { worldRank: "asc" },
    select: universityCardSelect,
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: rows.map(toUniversityCard),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Tag-cached entrypoint behind {@link listUniversities}. The cache key
 * encodes search/page/pageSize so distinct filter combinations don't
 * collide; tags allow targeted invalidation from Server Actions that
 * mutate universities.
 */
const cachedListUniversities = cached(
  (search: string, page: number, pageSize: number) =>
    listUniversitiesImpl(search === "" ? undefined : search, page, pageSize),
  ["universities", "list"],
  {
    tags: [CACHE_TAGS.universityList],
    revalidate: REVALIDATE.universityList,
  },
);

/**
 * Paginated universities listing with optional case-insensitive search by
 * name OR country. Sorted by `worldRank` ascending. Returns the standard
 * `PageResult<UniversityCardDTO>` envelope.
 *
 * Validates: Requirements 13.1, 13.4, 18.1.
 */
export function listUniversities(
  params: ListUniversitiesParams = {},
): Promise<PageResult<UniversityCardDTO>> {
  const search = params.search?.trim() ?? "";
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0
      ? Math.floor(params.pageSize)
      : DEFAULT_PAGE_SIZE;
  return cachedListUniversities(search, page, pageSize);
}

/**
 * Implementation of {@link partnerUniversities}. Always reads at most
 * `limit` rows where `isPartner = true`, sorted by `worldRank` ascending.
 */
async function partnerUniversitiesImpl(
  limit: number,
): Promise<UniversityCardDTO[]> {
  const rows = await prisma.university.findMany({
    where: { isPartner: true },
    orderBy: { worldRank: "asc" },
    select: universityCardSelect,
    take: limit,
  });
  return rows.map(toUniversityCard);
}

/**
 * Tag-cached entrypoint behind {@link partnerUniversities}. Tagged with
 * both `partnerUnis` (for partner-toggle invalidation) and `universityList`
 * (so any university mutation refreshes this list too).
 */
const cachedPartnerUniversities = cached(
  (limit: number) => partnerUniversitiesImpl(limit),
  ["universities", "partners"],
  {
    tags: [CACHE_TAGS.partnerUnis, CACHE_TAGS.universityList],
    revalidate: REVALIDATE.universityList,
  },
);

/**
 * Up to `limit` partner universities, sorted by `worldRank` ascending. Used
 * by the home page partner section (Req 4.5).
 *
 * Validates: Requirement 4.5.
 */
export function partnerUniversities(limit = 6): Promise<UniversityCardDTO[]> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 6;
  return cachedPartnerUniversities(safeLimit);
}

/**
 * Minimal university row consumed by `app/sitemap.ts`. `updatedAt` is
 * serialised to ISO-8601 so no raw Prisma `Date` leaks past the query layer
 * (Req 28.5).
 */
export type SitemapUniversity = { id: string; updatedAt: string };

/**
 * Every university's id + last-modified timestamp, for the dynamic sitemap
 * (Req 24.2). All universities are public, so none are filtered out.
 *
 * Cached on the `sitemap` tag so it is regenerated alongside the scholarship
 * entries when an approval/removal Server Action calls
 * `revalidateTag(CACHE_TAGS.sitemap)`.
 *
 * Validates: Requirement 24.2.
 */
const cachedUniversitiesForSitemap = cached(
  async (): Promise<SitemapUniversity[]> => {
    const rows = await prisma.university.findMany({
      select: { id: true, updatedAt: true },
    });
    return rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt.toISOString() }));
  },
  ["universities", "sitemap"],
  { tags: [CACHE_TAGS.sitemap] },
);

/**
 * All universities as `{ id, updatedAt }` for the sitemap. Thin wrapper over
 * the tag-cached implementation.
 */
export function universitiesForSitemap(): Promise<SitemapUniversity[]> {
  return cachedUniversitiesForSitemap();
}

/**
 * Fetch a full university record by primary key. Returns `null` when the
 * record does not exist so callers can hand off to `notFound()` (Req 14.4).
 *
 * Not cached at the query layer — the consuming detail page opts into ISR
 * (`revalidate = 60`) at the route segment level.
 */
export async function getUniversityById(
  id: string,
): Promise<UniversityDTO | null> {
  if (!id) return null;
  const row = await prisma.university.findUnique({ where: { id } });
  return row ? toUniversityDTO(row) : null;
}
