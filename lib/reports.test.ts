/**
 * Unit tests for the pure Reports helpers in `lib/reports.ts`.
 *
 * Cover the date-window contract from Requirement 31.1: default 30-day
 * window, 365-day max clamp, granularity validation, and UTC day-edge
 * anchoring. `now` is injected for determinism.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_GRANULARITY,
  MAX_RANGE_DAYS,
  parseGranularity,
  parseReportParams,
  toDateInputValue,
} from "./reports";

const NOW = new Date("2024-06-15T12:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("parseGranularity", () => {
  it("accepts the three known granularities", () => {
    expect(parseGranularity("daily")).toBe("daily");
    expect(parseGranularity("weekly")).toBe("weekly");
    expect(parseGranularity("monthly")).toBe("monthly");
  });

  it("rejects unknown or missing values", () => {
    expect(parseGranularity("yearly")).toBeUndefined();
    expect(parseGranularity(undefined)).toBeUndefined();
    expect(parseGranularity("")).toBeUndefined();
  });
});

describe("parseReportParams", () => {
  it("defaults to the last 30 days when no params are supplied", () => {
    const range = parseReportParams({}, NOW);
    expect(range.granularity).toBe(DEFAULT_GRANULARITY);
    // end anchored to the end of NOW's UTC day.
    expect(range.end.toISOString()).toBe("2024-06-15T23:59:59.999Z");
    // start anchored to midnight 30 days before.
    expect(range.start.toISOString()).toBe("2024-05-16T00:00:00.000Z");
  });

  it("defaults the window when the range is malformed", () => {
    const range = parseReportParams({ start: "not-a-date", end: "2024-06-01" }, NOW);
    expect(range.start.toISOString()).toBe("2024-05-16T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2024-06-15T23:59:59.999Z");
  });

  it("defaults the window when start is after end", () => {
    const range = parseReportParams(
      { start: "2024-06-10", end: "2024-06-01" },
      NOW,
    );
    expect(range.start.toISOString()).toBe("2024-05-16T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2024-06-15T23:59:59.999Z");
  });

  it("honours a valid in-range window with UTC day-edge anchoring", () => {
    const range = parseReportParams(
      { start: "2024-01-01", end: "2024-01-31", granularity: "weekly" },
      NOW,
    );
    expect(range.start.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2024-01-31T23:59:59.999Z");
    expect(range.granularity).toBe("weekly");
  });

  it("clamps windows wider than the 365-day maximum", () => {
    const range = parseReportParams(
      { start: "2020-01-01", end: "2024-06-15" },
      NOW,
    );
    // `start` is pulled forward so the floored whole-day span equals the max.
    const spanDays = Math.floor(
      (range.end.getTime() - range.start.getTime()) / MS_PER_DAY,
    );
    expect(spanDays).toBe(MAX_RANGE_DAYS);
    // The end bound is unchanged (clamp only moves `start`).
    expect(range.end.toISOString()).toBe("2024-06-15T23:59:59.999Z");
  });

  it("falls back to the default granularity for unknown values", () => {
    const range = parseReportParams(
      { start: "2024-01-01", end: "2024-01-31", granularity: "yearly" },
      NOW,
    );
    expect(range.granularity).toBe(DEFAULT_GRANULARITY);
  });

  it("rejects impossible calendar days and uses the default window", () => {
    const range = parseReportParams(
      { start: "2024-02-31", end: "2024-03-15" },
      NOW,
    );
    expect(range.start.toISOString()).toBe("2024-05-16T00:00:00.000Z");
  });
});

describe("toDateInputValue", () => {
  it("formats a Date as a UTC YYYY-MM-DD string", () => {
    expect(toDateInputValue(new Date("2024-06-15T23:59:59.999Z"))).toBe(
      "2024-06-15",
    );
    expect(toDateInputValue(new Date("2024-01-05T00:00:00.000Z"))).toBe(
      "2024-01-05",
    );
  });
});
