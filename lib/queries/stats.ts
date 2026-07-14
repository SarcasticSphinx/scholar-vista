/**
 * Stats / aggregation queries.
 *
 * Drives the home-page platform stats, the admin dashboard summary, and the
 * Reports page (category distribution, registration trend, application
 * stats by status). The home stats query is wrapped in `unstable_cache`
 * (`CACHE_TAGS.homeStats`, `REVALIDATE.homeStats`); admin queries are not
 * cached because admins expect fresh numbers on every load.
 *
 * Validates: Requirements 4.4 (home stats), 16.2 (dashboard counts), 16.3
 * (12-month application trend powered by `applicationTrendByMonth` in
 * `application.ts`), 31.2 (application stats by status), 31.3 (registration
 * trend), and Property 18 (displayed counts equal recomputed counts).
 */

import {
  ApplicationStatus,
  ScholarshipCategory,
} from "@/generated/prisma/client";
import { CACHE_TAGS, REVALIDATE, cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

import type { TimeBucket } from "./dto";

/* -------------------------------------------------------------------- */
/*                              Home stats                              */
/* -------------------------------------------------------------------- */

export interface PlatformStats {
  /** Approved scholarships only — Requirement 4.4. */
  scholarships: number;
  /** Total universities. */
  universities: number;
  /** Applications whose status is `COMPLETED` — Requirement 4.4. */
  completedApplications: number;
}

/**
 * Public home-page stats. Cached with `CACHE_TAGS.homeStats` so any
 * scholarship approve/reject or university CRUD mutation can invalidate it
 * via `revalidateTag`.
 *
 * Validates: Requirement 4.4.
 */
export const getPlatformStats = cached(
  async (): Promise<PlatformStats> => {
    const [scholarships, universities, completedApplications] =
      await Promise.all([
        prisma.scholarship.count({ where: { isApproved: true } }),
        prisma.university.count(),
        prisma.application.count({
          where: { status: ApplicationStatus.COMPLETED },
        }),
      ]);
    return { scholarships, universities, completedApplications };
  },
  ["stats", "platform"],
  { tags: [CACHE_TAGS.homeStats], revalidate: REVALIDATE.homeStats },
);

/* -------------------------------------------------------------------- */
/*                             Dashboard stats                          */
/* -------------------------------------------------------------------- */

export interface DashboardStats {
  /** Total scholarships (all approval states). */
  scholarships: number;
  universities: number;
  users: number;
  applications: number;
}

/**
 * Admin dashboard counts. Not cached — admins viewing the dashboard expect
 * counts to reflect the current database state on every load (Requirement
 * 16.2).
 *
 * Validates: Requirement 16.2.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [scholarships, universities, users, applications] = await Promise.all([
    prisma.scholarship.count(),
    prisma.university.count(),
    prisma.user.count(),
    prisma.application.count(),
  ]);
  return { scholarships, universities, users, applications };
}

/* -------------------------------------------------------------------- */
/*                         Category distribution                        */
/* -------------------------------------------------------------------- */

export interface CategoryCount {
  category: ScholarshipCategory;
  count: number;
}

/**
 * Distribution of approved scholarships by category. Returned in the order
 * declared by the `ScholarshipCategory` enum; categories with zero matches
 * are still represented with `count: 0` so the dashboard pie/bar chart has
 * a stable axis.
 *
 * Validates: Requirement 16.3.
 */
export async function getCategoryDistribution(): Promise<CategoryCount[]> {
  const grouped = await prisma.scholarship.groupBy({
    by: ["category"],
    where: { isApproved: true },
    _count: { _all: true },
  });

  const counts = new Map<ScholarshipCategory, number>(
    grouped.map((g) => [g.category, g._count._all]),
  );

  return Object.values(ScholarshipCategory).map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}

/* -------------------------------------------------------------------- */
/*                          Registration trend                          */
/* -------------------------------------------------------------------- */

export type Granularity = "daily" | "weekly" | "monthly";

export interface RegistrationTrendInput {
  start: Date;
  end: Date;
  granularity: Granularity;
}

/**
 * Counts of new user registrations per bucket over `[start, end]`. Buckets
 * with zero matches are returned with `count: 0` so the line chart renders
 * a continuous series. The implementation uses an in-memory bucketing pass
 * over a `findMany` of `createdAt` values — efficient up to a few hundred
 * thousand registrations per window, which exceeds the platform's expected
 * scale.
 *
 * Bucketing rules:
 *   - daily: anchored to the UTC midnight of each day.
 *   - weekly: anchored to UTC midnight of the Monday at or before each
 *     bucket's date (ISO week start).
 *   - monthly: anchored to the first instant of each calendar month (UTC).
 *
 * The sum of `bucket.count` equals `count(users where createdAt ∈ [start,
 * end])` — Property 19.
 *
 * Validates: Requirements 31.3, 19 (bucket sum equals window total).
 */
export async function getRegistrationTrend(
  input: RegistrationTrendInput,
): Promise<TimeBucket[]> {
  const { start, end, granularity } = input;

  const buckets = buildTimeBuckets(start, end, granularity);
  if (buckets.length === 0) return [];

  const rows = await prisma.user.findMany({
    where: { createdAt: { gte: buckets[0].start, lte: end } },
    select: { createdAt: true },
  });

  return tallyBuckets(rows.map((r) => r.createdAt), buckets, granularity);
}

/* -------------------------------------------------------------------- */
/*                     Application stats by status                      */
/* -------------------------------------------------------------------- */

export interface ApplicationStatusCounts {
  PENDING: number;
  PROCESSING: number;
  COMPLETED: number;
  REJECTED: number;
}

export interface ApplicationStatsByStatusInput {
  start: Date;
  end: Date;
}

/**
 * Application counts grouped by status over `[start, end]`. Always returns
 * all four `ApplicationStatus` keys, even when the count is zero, so the
 * caller can bind directly to chart axes / table columns.
 *
 * Validates: Requirement 31.2.
 */
export async function getApplicationStatsByStatus(
  input: ApplicationStatsByStatusInput,
): Promise<ApplicationStatusCounts> {
  const grouped = await prisma.application.groupBy({
    by: ["status"],
    where: { createdAt: { gte: input.start, lte: input.end } },
    _count: { _all: true },
  });

  const counts: ApplicationStatusCounts = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    REJECTED: 0,
  };
  for (const g of grouped) counts[g.status] = g._count._all;
  return counts;
}

/* -------------------------------------------------------------------- */
/*                   Application stats by category                      */
/* -------------------------------------------------------------------- */

export interface ApplicationCategoryCount {
  category: ScholarshipCategory;
  count: number;
}

export interface ApplicationStatsByCategoryInput {
  start: Date;
  end: Date;
}

/**
 * Application counts grouped by the parent scholarship's category over
 * `[start, end]`. Unlike {@link getCategoryDistribution} (which counts
 * approved *scholarships*), this date-bounded query counts *applications*
 * and powers the Reports page category breakdown (Requirement 31.2).
 *
 * Prisma's `groupBy` cannot group by a relation field, so applications in
 * the window are fetched with their scholarship category projected and
 * tallied in memory — the same in-process bucketing strategy used by
 * {@link getRegistrationTrend}, efficient at the platform's expected scale.
 * Every `ScholarshipCategory` key is returned (with `count: 0` when absent)
 * so the chart axis stays stable.
 *
 * Validates: Requirement 31.2.
 */
export async function getApplicationStatsByCategory(
  input: ApplicationStatsByCategoryInput,
): Promise<ApplicationCategoryCount[]> {
  const rows = await prisma.application.findMany({
    where: { createdAt: { gte: input.start, lte: input.end } },
    select: { scholarship: { select: { category: true } } },
  });

  const counts = new Map<ScholarshipCategory, number>();
  for (const row of rows) {
    const category = row.scholarship.category;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Object.values(ScholarshipCategory).map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}

/* -------------------------------------------------------------------- */
/*                          Bucket helpers (pure)                       */
/* -------------------------------------------------------------------- */

interface InternalBucket {
  start: Date;
  /** Exclusive upper bound. */
  endExclusive: Date;
  iso: string;
}

function buildTimeBuckets(
  rangeStart: Date,
  rangeEnd: Date,
  granularity: Granularity,
): InternalBucket[] {
  if (rangeEnd < rangeStart) return [];
  const buckets: InternalBucket[] = [];
  let cursor = startOfBucket(rangeStart, granularity);
  while (cursor <= rangeEnd) {
    const next = nextBucket(cursor, granularity);
    buckets.push({
      start: new Date(cursor),
      endExclusive: next,
      iso: cursor.toISOString(),
    });
    cursor = next;
  }
  return buckets;
}

function tallyBuckets(
  timestamps: Date[],
  buckets: InternalBucket[],
  granularity: Granularity,
): TimeBucket[] {
  const indexByIso = new Map<string, number>();
  buckets.forEach((b, i) => indexByIso.set(b.iso, i));

  const counts = new Array(buckets.length).fill(0) as number[];
  for (const ts of timestamps) {
    const anchorIso = startOfBucket(ts, granularity).toISOString();
    const idx = indexByIso.get(anchorIso);
    if (idx !== undefined) counts[idx] += 1;
  }

  return buckets.map((b, i) => ({ bucketIso: b.iso, count: counts[i] }));
}

/** Truncate `d` to the bucket anchor (UTC) for the given granularity. */
function startOfBucket(d: Date, granularity: Granularity): Date {
  if (granularity === "daily") {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );
  }
  if (granularity === "monthly") {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0),
    );
  }
  // Weekly: anchor to the Monday at or before `d` (ISO week start).
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  const anchor = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() - dayOfWeek,
      0,
      0,
      0,
      0,
    ),
  );
  return anchor;
}

/** Advance to the next bucket boundary for the given granularity. */
function nextBucket(anchor: Date, granularity: Granularity): Date {
  if (granularity === "daily") {
    return new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth(),
        anchor.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
  }
  if (granularity === "monthly") {
    return new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
        0,
      ),
    );
  }
  return new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() + 7,
      0,
      0,
      0,
      0,
    ),
  );
}
