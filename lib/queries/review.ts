/**
 * Review queries.
 *
 * Listing reviews by scholarship (detail page) or by user (My Reviews
 * page), plus the average-rating computation rendered on cards and detail
 * pages.
 *
 * Validates: Requirements 10.2 (paginated review listings on scholarship
 * detail), 10.5 (average rating equals arithmetic mean), and the supporting
 * `hasUserReviewed` lookup that powers Property 3 / Requirement 10.3
 * duplicate-review rejection upstream in the action layer.
 */

import { prisma } from "@/lib/prisma";

import {
  type PageResult,
  type ReviewWithScholarshipDTO,
  type ReviewWithUserDTO,
  clampPage,
  totalPagesOf,
} from "./dto";
import {
  toReviewWithScholarship,
  toReviewWithUser,
  universityRefInclude,
  userRefSelect,
} from "./_mappers";

const DEFAULT_DETAIL_PAGE_SIZE = 10;
const DEFAULT_USER_PAGE_SIZE = 12;

/* ----------------------- listReviewsByScholarship -------------------- */

/**
 * Reviews for a single scholarship, paginated 10/page (Requirement 10.2),
 * sorted by `createdAt desc`. Each row embeds the author so the UI can
 * render avatar/name without a follow-up query.
 *
 * Validates: Requirements 10.2, 5.11.
 */
export async function listReviewsByScholarship(
  scholarshipId: string,
  page: number,
  pageSize: number = DEFAULT_DETAIL_PAGE_SIZE,
): Promise<PageResult<ReviewWithUserDTO>> {
  const total = await prisma.review.count({ where: { scholarshipId } });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(page, totalPages);

  const rows = await prisma.review.findMany({
    where: { scholarshipId },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: { user: { select: userRefSelect } },
  });

  return {
    items: rows.map(toReviewWithUser),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/* -------------------------- listReviewsByUser ------------------------ */

/**
 * The user's own reviews (My Reviews page), 12/page sorted by `createdAt
 * desc`, with the related scholarship populated.
 *
 * Validates: Requirements 10.2, 5.11.
 */
export async function listReviewsByUser(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_USER_PAGE_SIZE,
): Promise<PageResult<ReviewWithScholarshipDTO>> {
  const total = await prisma.review.count({ where: { userId } });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(page, totalPages);

  const rows = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: { scholarship: { include: universityRefInclude } },
  });

  return {
    items: rows.map(toReviewWithScholarship),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/* ----------------------------- getAverageRating ---------------------- */

/**
 * Average `ratingPoint` for a scholarship using `prisma._avg`. Returns
 * `null` when no reviews exist (Requirement 10.5: average is the arithmetic
 * mean, undefined for an empty set).
 *
 * Validates: Requirement 10.5.
 */
export async function getAverageRating(
  scholarshipId: string,
): Promise<number | null> {
  const result = await prisma.review.aggregate({
    where: { scholarshipId },
    _avg: { ratingPoint: true },
  });
  return result._avg.ratingPoint ?? null;
}

/* ----------------------------- hasUserReviewed ----------------------- */

/**
 * Whether `(userId, scholarshipId)` already has a Review row. Index-only
 * via `Review_userId_scholarshipId_key`.
 *
 * Validates: Requirements 10.3, 2.10 (duplicate prevention).
 */
export async function hasUserReviewed(
  userId: string,
  scholarshipId: string,
): Promise<boolean> {
  const existing = await prisma.review.findUnique({
    where: { userId_scholarshipId: { userId, scholarshipId } },
    select: { id: true },
  });
  return existing !== null;
}
