/**
 * Application queries.
 *
 * Read-only Prisma access for the `Application` model. Listings, detail
 * lookups, ownership checks, and the 12-month application-trend bucket
 * series live here. All return values are DTOs (Decimals as strings, dates
 * as ISO strings) so they can cross the RSC/Server-Action boundary safely.
 *
 * Validates: Requirements 8.3, 12.1, 16.3, 19.1, 20.1.
 */

import type { Prisma } from "@/generated/prisma/client";
import { ApplicationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  type ApplicationDTO,
  type MonthBucket,
  type MyApplicationDTO,
  type PageResult,
  clampPage,
  totalPagesOf,
} from "./dto";
import {
  toApplicationDTO,
  toMyApplicationDTO,
  universityRefInclude,
  userRefSelect,
} from "./_mappers";

const DEFAULT_USER_PAGE_SIZE = 12;
const DEFAULT_ADMIN_PAGE_SIZE = 10;

/* ---------------------- listApplicationsByUser ------------------------ */

/**
 * Paginated list of applications owned by a single user, sorted by
 * `createdAt desc`. Each row embeds the related scholarship + university so
 * the caller can render a card without a follow-up fetch.
 *
 * The requested page is clamped to the available range — Requirement 5.11.
 *
 * Validates: Requirements 12.1, 5.11.
 */
export async function listApplicationsByUser(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_USER_PAGE_SIZE,
): Promise<PageResult<MyApplicationDTO>> {
  const where: Prisma.ApplicationWhereInput = { userId };

  const total = await prisma.application.count({ where });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(page, totalPages);

  const rows = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: { scholarship: { include: universityRefInclude } },
  });

  return {
    items: rows.map(toMyApplicationDTO),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/* ---------------------- listApplicationsAdmin ------------------------- */

export interface ListApplicationsAdminInput {
  status?: ApplicationStatus;
  scholarshipId?: string;
  /** Free-text search applied to applicant name / email. */
  applicantQuery?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Admin-side paginated list of all applications. Supports filtering by
 * status, scholarship, and a free-text search across applicant name + email.
 * Sorted by `createdAt desc`.
 *
 * Validates: Requirements 16.3, 20.1.
 */
export async function listApplicationsAdmin(
  input: ListApplicationsAdminInput,
): Promise<PageResult<ApplicationDTO>> {
  const pageSize = input.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE;
  const trimmedSearch = input.applicantQuery?.trim() ?? "";

  const where: Prisma.ApplicationWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.scholarshipId) where.scholarshipId = input.scholarshipId;

  // Search ≥ 2 chars matches applicant name (denormalized) + the user's name
  // and email — Requirement 5.2 case-insensitive search semantics.
  if (trimmedSearch.length >= 2) {
    where.OR = [
      { applicantName: { contains: trimmedSearch, mode: "insensitive" } },
      { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      { user: { email: { contains: trimmedSearch, mode: "insensitive" } } },
    ];
  }

  const total = await prisma.application.count({ where });
  const totalPages = totalPagesOf(total, pageSize);
  const safePage = clampPage(input.page ?? 1, totalPages);

  const rows = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: {
      scholarship: { include: universityRefInclude },
      user: { select: userRefSelect },
    },
  });

  return {
    items: rows.map(toApplicationDTO),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/* --------------------------- getApplicationById ----------------------- */

/**
 * Full application record (with user + scholarship populated). Returns
 * `null` when not found so callers can surface a 404 / `notFound()`.
 */
export async function getApplicationById(
  id: string,
): Promise<ApplicationDTO | null> {
  const row = await prisma.application.findUnique({
    where: { id },
    include: {
      scholarship: { include: universityRefInclude },
      user: { select: userRefSelect },
    },
  });
  return row ? toApplicationDTO(row) : null;
}

/* ---------------------------- hasUserApplied ------------------------- */

/**
 * Whether `(userId, scholarshipId)` already has an Application row. Backed
 * by the `Application_userId_scholarshipId_key` unique constraint so the
 * lookup is index-only and cheap.
 *
 * Validates: Requirements 7.6, 2.10.
 */
export async function hasUserApplied(
  userId: string,
  scholarshipId: string,
): Promise<boolean> {
  const existing = await prisma.application.findUnique({
    where: { userId_scholarshipId: { userId, scholarshipId } },
    select: { id: true },
  });
  return existing !== null;
}

/* ------------------------ applicationTrendByMonth -------------------- */

/**
 * Bucket counts of applications per calendar month for the last `months`
 * months (default 12), inclusive of the current month. Each bucket is
 * anchored to the first instant of that month in UTC. Buckets with zero
 * matching rows still appear with `count: 0` so charts can render a
 * continuous series.
 *
 * The implementation issues a single `findMany` with the full window, then
 * tallies in memory — a `groupBy` with a `date_trunc` SQL fragment would be
 * faster but Prisma does not yet expose date truncation cleanly. The
 * dataset for any reasonable platform usage (tens of thousands per month)
 * is well within memory budgets for an admin-only query.
 *
 * Validates: Requirements 16.3, 19 (Property 19 — bucket sum equals
 * window total).
 */
export async function applicationTrendByMonth(
  months: number = 12,
): Promise<MonthBucket[]> {
  const safeMonths = Math.max(1, Math.floor(months));
  const buckets = buildMonthBuckets(safeMonths);
  const start = new Date(buckets[0].monthIso);

  const rows = await prisma.application.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const indexByIso = new Map(buckets.map((b, i) => [b.monthIso, i]));
  for (const row of rows) {
    const key = monthAnchorIso(row.createdAt);
    const idx = indexByIso.get(key);
    if (idx !== undefined) buckets[idx].count += 1;
  }

  return buckets;
}

/**
 * Build the inclusive list of month buckets ending at the current month.
 * Anchored to UTC so the series is stable across server timezones.
 */
function buildMonthBuckets(months: number): MonthBucket[] {
  const now = new Date();
  const yearNow = now.getUTCFullYear();
  const monthNow = now.getUTCMonth();
  const result: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(yearNow, monthNow - i, 1, 0, 0, 0, 0));
    result.push({ monthIso: d.toISOString(), count: 0 });
  }
  return result;
}

/** ISO timestamp anchored at the first instant of the row's month (UTC). */
function monthAnchorIso(d: Date): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}
