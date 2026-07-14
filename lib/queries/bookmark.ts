/**
 * Bookmark queries.
 *
 * Read paths for the user's bookmarked scholarships. The toggle mutation
 * lives in `actions/bookmark.ts`; this module is read-only.
 *
 * Returns the same `ScholarshipCardDTO` exported from
 * `lib/queries/scholarship.ts` so the bookmarks page can reuse the
 * existing `ScholarshipCard` component without an extra round trip.
 *
 * Validates: Requirement 8.3 (paginated bookmarks list) and the supporting
 * lookups Property 8 / Requirements 8.1, 8.2 rely on for state inspection.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { Paginated, ScholarshipCardDTO } from "./scholarship";

const DEFAULT_PAGE_SIZE = 12;

/**
 * Prisma `include` shape for the embedded scholarship card data. Mirrors
 * the catalog query so DTOs are interchangeable.
 */
const SCHOLARSHIP_CARD_INCLUDE = {
  university: { select: { id: true, name: true, logo: true } },
} as const satisfies Prisma.ScholarshipInclude;

type ScholarshipCardRow = Prisma.ScholarshipGetPayload<{
  include: typeof SCHOLARSHIP_CARD_INCLUDE;
}>;

/**
 * Aggregate average rating + review count for the supplied scholarship ids
 * in a single `groupBy`. Same shape as `listScholarships` so the cards on
 * the bookmarks page render identical metadata.
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

/**
 * Compute total pages and clamp the requested page to `[1, totalPages]`.
 *
 * Validates: Requirement 5.11 (last-page clamping for paginated queries).
 */
function clampPagination(
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

/* ---------------------- listBookmarksByUser -------------------------- */

/**
 * Paginated list of scholarships the user has bookmarked, sorted by the
 * bookmark's `createdAt` (most recent first). Each scholarship is returned
 * as a `ScholarshipCardDTO` so the bookmarks page can reuse the existing
 * scholarship card component without an extra round trip.
 *
 * Validates: Requirements 8.3, 5.11 (last-page clamping).
 */
export async function listBookmarksByUser(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<Paginated<ScholarshipCardDTO>> {
  const total = await prisma.bookmark.count({ where: { userId } });
  const { clampedPage, totalPages } = clampPagination(page, pageSize, total);

  if (total === 0) {
    return { items: [], total, totalPages, page: clampedPage };
  }

  const rows = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (clampedPage - 1) * pageSize,
    take: pageSize,
    include: { scholarship: { include: SCHOLARSHIP_CARD_INCLUDE } },
  });

  const scholarshipRows = rows.map((row) => row.scholarship);
  const ratings = await ratingsForIds(scholarshipRows.map((s) => s.id));

  return {
    items: scholarshipRows.map((s) => toCardDTO(s, ratings)),
    total,
    totalPages,
    page: clampedPage,
  };
}

/* ----------------------------- isBookmarked -------------------------- */

/**
 * Whether `(userId, scholarshipId)` has a bookmark row. Index-only via the
 * `Bookmark_userId_scholarshipId_key` unique constraint.
 *
 * Validates: Requirement 8.4 (bookmark state lookup powers Property 8).
 */
export async function isBookmarked(
  userId: string,
  scholarshipId: string,
): Promise<boolean> {
  const existing = await prisma.bookmark.findUnique({
    where: { userId_scholarshipId: { userId, scholarshipId } },
    select: { id: true },
  });
  return existing !== null;
}

/* -------------------------- getUserBookmarkSet ----------------------- */

/**
 * Resolve, for one user, which of the supplied scholarship ids are
 * bookmarked. Used by listing pages to render the bookmark icon state for
 * a whole page of cards in a single query rather than N point lookups.
 *
 * The returned `Set` contains only the ids that are bookmarked; ids absent
 * from the input are not present in the output.
 */
export async function getUserBookmarkSet(
  userId: string,
  scholarshipIds: readonly string[],
): Promise<Set<string>> {
  if (scholarshipIds.length === 0) return new Set();

  const rows = await prisma.bookmark.findMany({
    where: { userId, scholarshipId: { in: [...scholarshipIds] } },
    select: { scholarshipId: true },
  });
  return new Set(rows.map((r) => r.scholarshipId));
}
