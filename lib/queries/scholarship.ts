/**
 * Scholarship read queries.
 *
 * Public catalog reads return DTOs (`ScholarshipCardDTO` / `ScholarshipDetailDTO`)
 * so RSC pages never receive raw Prisma rows. `Decimal` columns (`stipend`,
 * `fees`) are converted to strings and `DateTime` values are serialised as ISO
 * 8601 strings before crossing the server/client boundary.
 *
 * Caching:
 * - `featuredScholarships` and `listScholarships` are wrapped with
 *   `cached(...)` from `@/lib/cache` so repeated public-catalog renders hit
 *   the Next.js Data Cache. Mutations should call
 *   `revalidateTag(CACHE_TAGS.scholarshipList)` (or
 *   `revalidateTag(CACHE_TAGS.scholarshipDetail(id))`).
 * - Auth-dependent reads (`getScholarshipForOwner`, `pendingScholarships`)
 *   are intentionally NOT cached.
 *
 * Average rating:
 * - Computed via a single `prisma.review.groupBy` over the page's IDs and
 *   merged in-memory. For `sort: 'rating'` we widen the groupBy to all
 *   matching rows so we can order before paginating.
 *
 * Validates: Requirements 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.11, 6.7,
 * 14.2, 17.1, 21.1.
 */

import type { Prisma, ScholarshipCategory } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { CACHE_TAGS, REVALIDATE, cached } from "@/lib/cache";

// ---------- DTOs ----------

/**
 * Compact scholarship row used by every catalog/listing surface.
 *
 * Mirrors the shape declared in design.md "Domain DTOs". `Decimal` is
 * converted to string and `Date` to an ISO string so the value is safely
 * serialisable across the RSC boundary.
 */
export type ScholarshipCardDTO = {
  id: string;
  title: string;
  university: { id: string; name: string; logo: string | null };
  category: ScholarshipCategory;
  deadline: string; // ISO 8601
  stipend: string; // Decimal -> string
  location: string;
  averageRating: number | null;
  isBookmarked?: boolean; // joined per session
};

/**
 * Full scholarship payload used by detail pages, related lists, and the
 * approval workflow. Contains every field a renderer or `generateMetadata`
 * call could need.
 */
export type ScholarshipDetailDTO = {
  id: string;
  title: string;
  university: {
    id: string;
    name: string;
    logo: string | null;
    country: string;
    city: string;
    website: string;
  };
  category: ScholarshipCategory;
  subject: string;
  description: string;
  stipend: string;
  coverage: string;
  location: string;
  requirements: string;
  deadline: string; // ISO 8601
  applicationLink: string;
  fees: string;
  image: string | null;
  isApproved: boolean;
  postedById: string;
  createdAt: string;
  updatedAt: string;
  averageRating: number | null;
  reviewCount: number;
};

/** Page envelope returned by every paginated query in this module. */
export type Paginated<T> = {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
};

// ---------- Filter / sort inputs ----------

export type ScholarshipSort = "deadline" | "rating" | "createdAt";

export type ScholarshipListFilters = {
  /** Free-text search, applied case-insensitively to title/subject/university name. */
  q?: string;
  category?: ScholarshipCategory;
  /** Matches University.country exactly (case-insensitive). */
  country?: string;
  /**
   * Funding type. The schema has no dedicated column, so the term is matched
   * (case-insensitive) against `coverage`/`description` to honour Req 5.5.
   */
  funding?: string;
  /** Deadline window in days from "now"; only `7 | 30 | 90` are accepted. */
  deadline?: 7 | 30 | 90;
};

export type ListScholarshipsArgs = {
  filters?: ScholarshipListFilters;
  sort?: ScholarshipSort;
  page?: number;
  pageSize?: number;
};

// ---------- Internal helpers ----------

/**
 * Prisma `include` shape used for every DTO conversion in this module. It
 * keeps the conversion helpers fully typed without resorting to `any`.
 */
const SCHOLARSHIP_DETAIL_INCLUDE = {
  university: {
    select: {
      id: true,
      name: true,
      logo: true,
      country: true,
      city: true,
      website: true,
    },
  },
} as const satisfies Prisma.ScholarshipInclude;

/**
 * Column-level `select` for card/listing surfaces. Unlike an `include`
 * (which returns *every* scalar column of `Scholarship`), this pulls only
 * the handful of fields `toCardDTO` actually reads. That keeps the big text
 * columns (`description` up to 5000 chars, `requirements` 3000, `coverage`,
 * `applicationLink`, …) out of listing queries entirely — meaningfully less
 * data over the wire on every catalog render, which matters given the
 * per-query network latency to the database.
 */
const SCHOLARSHIP_CARD_SELECT = {
  id: true,
  title: true,
  category: true,
  deadline: true,
  stipend: true,
  location: true,
  university: { select: { id: true, name: true, logo: true } },
} as const satisfies Prisma.ScholarshipSelect;

type ScholarshipDetailRow = Prisma.ScholarshipGetPayload<{
  include: typeof SCHOLARSHIP_DETAIL_INCLUDE;
}>;

type ScholarshipCardRow = Prisma.ScholarshipGetPayload<{
  select: typeof SCHOLARSHIP_CARD_SELECT;
}>;

/**
 * Pull average rating + review count for each scholarship id in a single
 * query, returning a lookup map. We hit the DB once per page rather than
 * once per row.
 */
async function ratingsForIds(
  ids: readonly string[],
): Promise<Map<string, { avg: number | null; count: number }>> {
  if (ids.length === 0) return new Map();

  const grouped = await prisma.review.groupBy({
    by: ["scholarshipId"],
    where: { scholarshipId: { in: [...ids] } },
    _avg: { ratingPoint: true },
    _count: { _all: true },
  });

  const map = new Map<string, { avg: number | null; count: number }>();
  for (const id of ids) map.set(id, { avg: null, count: 0 });
  for (const row of grouped) {
    map.set(row.scholarshipId, {
      avg: row._avg.ratingPoint ?? null,
      count: row._count._all,
    });
  }
  return map;
}

function toCardDTO(
  row: ScholarshipCardRow,
  ratings: Map<string, { avg: number | null; count: number }>,
): ScholarshipCardDTO {
  return {
    id: row.id,
    title: row.title,
    university: {
      id: row.university.id,
      name: row.university.name,
      logo: row.university.logo,
    },
    category: row.category,
    deadline: row.deadline.toISOString(),
    stipend: row.stipend.toString(),
    location: row.location,
    averageRating: ratings.get(row.id)?.avg ?? null,
  };
}

function toDetailDTO(
  row: ScholarshipDetailRow,
  rating: { avg: number | null; count: number },
): ScholarshipDetailDTO {
  return {
    id: row.id,
    title: row.title,
    university: {
      id: row.university.id,
      name: row.university.name,
      logo: row.university.logo,
      country: row.university.country,
      city: row.university.city,
      website: row.university.website,
    },
    category: row.category,
    subject: row.subject,
    description: row.description,
    stipend: row.stipend.toString(),
    coverage: row.coverage,
    location: row.location,
    requirements: row.requirements,
    deadline: row.deadline.toISOString(),
    applicationLink: row.applicationLink,
    fees: row.fees.toString(),
    image: row.image,
    isApproved: row.isApproved,
    postedById: row.postedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    averageRating: rating.avg,
    reviewCount: rating.count,
  };
}

/**
 * Build the Prisma `where` clause for the public catalog from a parsed filter
 * object. The clause always pins `isApproved = true` so unapproved
 * submissions never leak into public listings (Req 5.1).
 */
function buildPublicWhere(
  filters: ScholarshipListFilters,
): Prisma.ScholarshipWhereInput {
  const AND: Prisma.ScholarshipWhereInput[] = [{ isApproved: true }];

  // q: Req 5.2 — case-insensitive search over title / subject / university.name.
  // Only apply when the trimmed query is at least 2 characters.
  if (filters.q && filters.q.trim().length >= 2) {
    const q = filters.q.trim();
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { university: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  // Req 5.3 — categorical filter.
  if (filters.category) AND.push({ category: filters.category });

  // Req 5.4 — country filter routed through the joined University record.
  if (filters.country && filters.country.trim().length > 0) {
    AND.push({
      university: {
        country: { equals: filters.country.trim(), mode: "insensitive" },
      },
    });
  }

  // Req 5.5 — funding type. The schema has no dedicated column, so the term
  // is matched against the human-readable `coverage` / `description` fields.
  if (filters.funding && filters.funding.trim().length > 0) {
    const f = filters.funding.trim();
    AND.push({
      OR: [
        { coverage: { contains: f, mode: "insensitive" } },
        { description: { contains: f, mode: "insensitive" } },
      ],
    });
  }

  // Req 5.6 — deadline window. We anchor `now` inside the function so cached
  // call sites get a stable horizon for the duration of the cache window.
  if (filters.deadline === 7 || filters.deadline === 30 || filters.deadline === 90) {
    const now = new Date();
    const horizon = new Date(now.getTime() + filters.deadline * 24 * 60 * 60 * 1000);
    AND.push({ deadline: { gte: now, lte: horizon } });
  }

  return AND.length === 1 ? AND[0] : { AND };
}

/**
 * Compute total pages for a given total + page size, clamping the requested
 * page so callers never get an empty slice for over-shot navigation
 * (Req 5.11).
 *
 * Returns `clampedPage` ≥ 1 even when there are zero results so URL
 * round-trips remain stable.
 */
function clampPage(
  page: number,
  pageSize: number,
  total: number,
): { clampedPage: number; totalPages: number } {
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  if (total <= 0) return { clampedPage: 1, totalPages: 0 };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = safePage > totalPages ? totalPages : safePage;
  return { clampedPage, totalPages };
}

// ---------- Listing ----------

/**
 * Internal, uncached implementation for `listScholarships`. The cached
 * wrapper below memoises this on `[filters, sort, page, pageSize]`.
 *
 * Sort handling:
 * - `deadline` → `deadline asc`
 * - `createdAt` (default) → `createdAt desc`
 * - `rating` → resolved in two passes because Prisma can't `orderBy` a
 *   joined aggregate directly: we pull every matching ID, compute averages
 *   via `groupBy`, sort in JS, then `findMany` the page slice.
 */
async function listScholarshipsImpl({
  filters = {},
  sort = "createdAt",
  page = 1,
  pageSize = 12,
}: ListScholarshipsArgs): Promise<Paginated<ScholarshipCardDTO>> {
  const where = buildPublicWhere(filters);

  const total = await prisma.scholarship.count({ where });
  const { clampedPage, totalPages } = clampPage(page, pageSize, total);

  if (total === 0) {
    return { items: [], total, totalPages, page: clampedPage };
  }

  const skip = (clampedPage - 1) * pageSize;

  let rows: ScholarshipCardRow[];
  let ratingMap: Map<string, { avg: number | null; count: number }>;

  if (sort === "rating") {
    // Two-pass approach so the highest-rated scholarships surface first.
    const allMatching = await prisma.scholarship.findMany({
      where,
      select: { id: true },
    });
    const allIds = allMatching.map((r) => r.id);
    const fullRatings = await ratingsForIds(allIds);

    // Sort by avg DESC; treat nulls as the smallest value, then break ties by
    // most recent (id descending — cuid is k-sortable and good enough as a
    // stable tiebreaker without an extra DB round-trip).
    allIds.sort((a, b) => {
      const av = fullRatings.get(a)?.avg ?? -1;
      const bv = fullRatings.get(b)?.avg ?? -1;
      if (bv !== av) return bv - av;
      return b.localeCompare(a);
    });

    const pageIds = allIds.slice(skip, skip + pageSize);
    const fetched = await prisma.scholarship.findMany({
      where: { id: { in: pageIds } },
      select: SCHOLARSHIP_CARD_SELECT,
    });

    // Re-order to match `pageIds` (Prisma does not preserve `in` order).
    const byId = new Map(fetched.map((r) => [r.id, r]));
    rows = pageIds
      .map((id) => byId.get(id))
      .filter((r): r is ScholarshipCardRow => r !== undefined);
    ratingMap = fullRatings;
  } else {
    const orderBy: Prisma.ScholarshipOrderByWithRelationInput =
      sort === "deadline" ? { deadline: "asc" } : { createdAt: "desc" };

    rows = await prisma.scholarship.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: SCHOLARSHIP_CARD_SELECT,
    });
    ratingMap = await ratingsForIds(rows.map((r) => r.id));
  }

  return {
    items: rows.map((r) => toCardDTO(r, ratingMap)),
    total,
    totalPages,
    page: clampedPage,
  };
}

/**
 * Paginated public-catalog query. Cached per `[filters, sort, page, pageSize]`
 * tuple so the same browse URL skips the DB on subsequent renders within the
 * `scholarship-list` revalidation window.
 *
 * Returns a `Paginated<ScholarshipCardDTO>` envelope. When `page` exceeds
 * `totalPages`, the last available page is returned (Req 5.11).
 */
export const listScholarships = cached(
  (args: ListScholarshipsArgs = {}) => listScholarshipsImpl(args),
  ["scholarships", "list"],
  {
    tags: [CACHE_TAGS.scholarshipList],
    revalidate: REVALIDATE.scholarshipList,
  },
);

// ---------- Detail ----------

async function detailById(id: string): Promise<ScholarshipDetailDTO | null> {
  const row = await prisma.scholarship.findUnique({
    where: { id },
    include: SCHOLARSHIP_DETAIL_INCLUDE,
  });
  if (!row) return null;
  const ratings = await ratingsForIds([row.id]);
  return toDetailDTO(row, ratings.get(row.id) ?? { avg: null, count: 0 });
}

/**
 * Public detail lookup. Returns `null` when the scholarship does not exist
 * **or** has not been approved — RSC pages should turn that into `notFound()`
 * (Req 6.9).
 */
export async function getScholarshipById(
  id: string,
): Promise<ScholarshipDetailDTO | null> {
  const detail = await detailById(id);
  if (!detail) return null;
  if (!detail.isApproved) return null;
  return detail;
}

/**
 * Detail lookup that bypasses the `isApproved` gate when the requester is the
 * scholarship owner or an admin/moderator. Used by the "My submissions" view
 * and the admin approval workflow (Req 11.2, 21.2).
 */
export async function getScholarshipForOwner(
  id: string,
  userId: string,
  isAdmin: boolean,
): Promise<ScholarshipDetailDTO | null> {
  const detail = await detailById(id);
  if (!detail) return null;
  if (detail.isApproved) return detail;
  if (isAdmin || detail.postedById === userId) return detail;
  return null;
}

// ---------- Related / featured / pending / by-university ----------

/**
 * Up to `limit` approved scholarships sharing the supplied scholarship's
 * category or university (Req 6.7). The source scholarship is always
 * excluded.
 */
export async function relatedScholarships(
  scholarshipId: string,
  limit = 6,
): Promise<ScholarshipCardDTO[]> {
  const source = await prisma.scholarship.findUnique({
    where: { id: scholarshipId },
    select: { id: true, category: true, universityId: true },
  });
  if (!source) return [];

  const rows = await prisma.scholarship.findMany({
    where: {
      isApproved: true,
      id: { not: source.id },
      OR: [{ category: source.category }, { universityId: source.universityId }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: SCHOLARSHIP_CARD_SELECT,
  });
  const ratings = await ratingsForIds(rows.map((r) => r.id));
  return rows.map((r) => toCardDTO(r, ratings));
}

/**
 * Up to `limit` most recently created approved scholarships, used by the
 * home-page "Featured" rail (Req 4.3). Cached on the `scholarship-list` tag
 * so admin approvals invalidate it via `revalidateTag`.
 */
export const featuredScholarships = cached(
  async (limit = 6): Promise<ScholarshipCardDTO[]> => {
    const rows = await prisma.scholarship.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: SCHOLARSHIP_CARD_SELECT,
    });
    const ratings = await ratingsForIds(rows.map((r) => r.id));
    return rows.map((r) => toCardDTO(r, ratings));
  },
  ["scholarships", "featured"],
  {
    tags: [CACHE_TAGS.scholarshipList],
    revalidate: REVALIDATE.scholarshipList,
  },
);

/**
 * Admin queue of pending (unapproved) submissions, oldest first (Req 21.1).
 * Not cached — the approval queue must reflect new submissions immediately.
 */
export async function pendingScholarships(
  page = 1,
  pageSize = 20,
): Promise<Paginated<ScholarshipDetailDTO & { postedBy: { id: string; name: string; email: string } }>> {
  const where: Prisma.ScholarshipWhereInput = { isApproved: false };

  const total = await prisma.scholarship.count({ where });
  const { clampedPage, totalPages } = clampPage(page, pageSize, total);

  if (total === 0) {
    return { items: [], total, totalPages, page: clampedPage };
  }

  const skip = (clampedPage - 1) * pageSize;
  const rows = await prisma.scholarship.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip,
    take: pageSize,
    include: {
      ...SCHOLARSHIP_DETAIL_INCLUDE,
      postedBy: { select: { id: true, name: true, email: true } },
    },
  });
  const ratings = await ratingsForIds(rows.map((r) => r.id));
  const items = rows.map((row) => ({
    ...toDetailDTO(row, ratings.get(row.id) ?? { avg: null, count: 0 }),
    postedBy: {
      id: row.postedBy.id,
      name: row.postedBy.name,
      email: row.postedBy.email,
    },
  }));

  return { items, total, totalPages, page: clampedPage };
}

// ---------- Sitemap ----------

/**
 * Minimal scholarship row consumed by `app/sitemap.ts`. `updatedAt` is
 * serialised to ISO-8601 so no raw Prisma `Date` leaks past the query layer
 * (design "Domain DTOs" / Req 28.5); `MetadataRoute.Sitemap#lastModified`
 * accepts the ISO string directly.
 */
export type SitemapScholarship = { id: string; updatedAt: string };

/**
 * Every approved scholarship's id + last-modified timestamp, for the dynamic
 * sitemap (Req 24.2). Unapproved submissions are excluded so they never leak
 * into the public sitemap.
 *
 * Cached on the `sitemap` tag (no time-based revalidation): the approval and
 * removal Server Actions call `revalidateTag(CACHE_TAGS.sitemap)` so the
 * sitemap regenerates exactly when the set of approved scholarships changes.
 *
 * Validates: Requirement 24.2.
 */
export const approvedScholarshipsForSitemap = cached(
  async (): Promise<SitemapScholarship[]> => {
    const rows = await prisma.scholarship.findMany({
      where: { isApproved: true },
      select: { id: true, updatedAt: true },
    });
    return rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt.toISOString() }));
  },
  ["scholarships", "sitemap"],
  { tags: [CACHE_TAGS.sitemap] },
);

/**
 * Approved scholarships posted by a given university, soonest deadline first
 * (Req 14.2). Used by the university detail page.
 */
export async function scholarshipsByUniversity(
  universityId: string,
  page = 1,
  pageSize = 10,
): Promise<Paginated<ScholarshipCardDTO>> {
  const where: Prisma.ScholarshipWhereInput = {
    isApproved: true,
    universityId,
  };

  const total = await prisma.scholarship.count({ where });
  const { clampedPage, totalPages } = clampPage(page, pageSize, total);

  if (total === 0) {
    return { items: [], total, totalPages, page: clampedPage };
  }

  const skip = (clampedPage - 1) * pageSize;
  const rows = await prisma.scholarship.findMany({
    where,
    orderBy: { deadline: "asc" },
    skip,
    take: pageSize,
    select: SCHOLARSHIP_CARD_SELECT,
  });
  const ratings = await ratingsForIds(rows.map((r) => r.id));

  return {
    items: rows.map((r) => toCardDTO(r, ratings)),
    total,
    totalPages,
    page: clampedPage,
  };
}

// ---------- Search suggestions (autocomplete) ----------

/**
 * Lightweight suggestion item returned to the search autocomplete. Both
 * variants share `title`/`subtitle` so the client can render a uniform
 * two-line row, while `type` + `id` tell it where a click should navigate
 * (`/scholarships/:id` vs `/universities/:id`).
 */
export type SearchSuggestion = {
  type: "scholarship" | "university";
  id: string;
  title: string;
  subtitle: string;
};

/**
 * Return up to a handful of scholarship + university matches for a search
 * box query, used by `GET /api/scholarships/suggest` to power the
 * navbar/hero/browse autocomplete.
 *
 * - Requires a trimmed query of at least 2 characters (matches the public
 *   catalog's `q` rule); shorter queries return `[]`.
 * - Scholarship matches are gated on `isApproved = true` so unapproved
 *   submissions never surface, mirroring `buildPublicWhere`.
 * - Not cached: the query is small and index-friendly, and suggestions
 *   should reflect newly approved rows immediately.
 */
export async function searchSuggestions(
  query: string,
  limit = 8,
): Promise<SearchSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const scholarshipTake = Math.max(1, Math.min(limit - 2, 6));
  const universityTake = Math.max(1, Math.min(limit - scholarshipTake, 4));

  const [scholarships, universities] = await Promise.all([
    prisma.scholarship.findMany({
      where: {
        isApproved: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { university: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: scholarshipTake,
      select: {
        id: true,
        title: true,
        university: { select: { name: true } },
      },
    }),
    prisma.university.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { worldRank: "asc" },
      take: universityTake,
      select: { id: true, name: true, country: true },
    }),
  ]);

  return [
    ...scholarships.map((s) => ({
      type: "scholarship" as const,
      id: s.id,
      title: s.title,
      subtitle: s.university.name,
    })),
    ...universities.map((u) => ({
      type: "university" as const,
      id: u.id,
      title: u.name,
      subtitle: u.country,
    })),
  ];
}
