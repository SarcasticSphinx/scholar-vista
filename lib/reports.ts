/**
 * Pure helpers for the admin Reports page (Requirement 31).
 *
 * The Reports page is URL-driven: `?start`, `?end`, and `?granularity`
 * control the date window and time-series bucketing. Keeping the parsing /
 * clamping logic here (free of React and Prisma) lets the server page, the
 * client filter island, and unit tests all share one source of truth.
 *
 * Date-window contract (Requirement 31.1):
 *   - Defaults to the last 30 days when no params (or invalid params) are
 *     supplied.
 *   - The maximum selectable range is 365 days; wider windows clamp the
 *     `start` forward to `end − 365 days`.
 *   - `start`/`end` are interpreted as UTC calendar days. `start` anchors at
 *     `00:00:00.000Z`; `end` anchors at `23:59:59.999Z` so the whole end day
 *     is included in `[start, end]` range queries.
 *
 * Validates: Requirements 31.1, 31.2, 31.3.
 */

export type Granularity = "daily" | "weekly" | "monthly";

export const GRANULARITIES: readonly Granularity[] = [
  "daily",
  "weekly",
  "monthly",
] as const;

/** Default window width, in days, when no valid range is supplied. */
export const DEFAULT_RANGE_DAYS = 30;

/** Hard upper bound on the selectable window, in days (Requirement 31.1). */
export const MAX_RANGE_DAYS = 365;

/** Default granularity for a fresh report view. */
export const DEFAULT_GRANULARITY: Granularity = "daily";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Raw, possibly-undefined params as they arrive from the URL. */
export interface RawReportParams {
  start?: string;
  end?: string;
  granularity?: string;
}

/** Fully-resolved, validated report window. */
export interface ReportRange {
  /** Inclusive lower bound, anchored at UTC midnight. */
  start: Date;
  /** Inclusive upper bound, anchored at the last ms of the UTC day. */
  end: Date;
  granularity: Granularity;
}

/** Narrow an arbitrary string to a known `Granularity`, else `undefined`. */
export function parseGranularity(value: string | undefined): Granularity | undefined {
  return value !== undefined && (GRANULARITIES as readonly string[]).includes(value)
    ? (value as Granularity)
    : undefined;
}

/**
 * Parse a `YYYY-MM-DD` (or ISO) string into a UTC Date anchored at either
 * the start or end of that calendar day. Returns `undefined` for malformed
 * input so callers can fall back to defaults.
 */
function parseCalendarDay(
  value: string | undefined,
  edge: "start" | "end",
): Date | undefined {
  if (!value) return undefined;
  // Accept bare calendar days as well as full ISO strings.
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!dayMatch) return undefined;
  const [, y, m, d] = dayMatch;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const ms =
    edge === "start"
      ? Date.UTC(year, month - 1, day, 0, 0, 0, 0)
      : Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const date = new Date(ms);
  // Reject impossible dates (e.g. 2024-02-31 rolling over).
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return date;
}

/** Format a Date as a `YYYY-MM-DD` UTC calendar day (for `<input type=date>`). */
export function toDateInputValue(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** UTC end-of-day anchor (23:59:59.999Z) for the given Date's calendar day. */
function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

/** UTC start-of-day anchor (00:00:00.000Z) for the given Date's calendar day. */
function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

/**
 * Resolve raw URL params into a validated {@link ReportRange}, applying the
 * default-30-day window, the 365-day max clamp, and granularity validation.
 *
 * Falls back to the default window when:
 *   - either bound is missing or malformed, or
 *   - `start` is after `end`.
 *
 * `now` is injectable for deterministic tests.
 *
 * Validates: Requirement 31.1.
 */
export function parseReportParams(
  raw: RawReportParams,
  now: Date = new Date(),
): ReportRange {
  const granularity = parseGranularity(raw.granularity) ?? DEFAULT_GRANULARITY;

  const parsedStart = parseCalendarDay(raw.start, "start");
  const parsedEnd = parseCalendarDay(raw.end, "end");

  // Default window: [now − 30 days, now], both anchored to UTC day edges.
  const defaultEnd = endOfUtcDay(now);
  const defaultStart = startOfUtcDay(
    new Date(defaultEnd.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY),
  );

  if (!parsedStart || !parsedEnd || parsedStart.getTime() > parsedEnd.getTime()) {
    return { start: defaultStart, end: defaultEnd, granularity };
  }

  let start = parsedStart;
  const end = parsedEnd;

  // Clamp to the maximum 365-day window by pulling `start` forward.
  const maxSpanMs = MAX_RANGE_DAYS * MS_PER_DAY;
  if (end.getTime() - start.getTime() > maxSpanMs) {
    start = startOfUtcDay(new Date(end.getTime() - maxSpanMs));
  }

  return { start, end, granularity };
}
