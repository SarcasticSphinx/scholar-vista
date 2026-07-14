// @vitest-environment jsdom

/**
 * Smoke tests for the `RegistrationTrendChart` client component. Recharts
 * cannot lay out inside jsdom, so these tests assert the component mounts
 * and renders its responsive wrapper across granularities and empty data.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RegistrationTrendChart } from "./registration-trend-chart";

afterEach(() => cleanup());

const SAMPLE = [
    { bucketIso: "2024-01-01T00:00:00.000Z", count: 3 },
    { bucketIso: "2024-01-02T00:00:00.000Z", count: 5 },
    { bucketIso: "2024-01-03T00:00:00.000Z", count: 0 },
];

describe("RegistrationTrendChart", () => {
    it("renders the responsive wrapper for daily data", () => {
        const { container } = render(
            <RegistrationTrendChart data={SAMPLE} granularity="daily" />,
        );
        expect(
            container.querySelector('[data-slot="registration-trend-chart"]'),
        ).toBeInTheDocument();
    });

    it("renders for monthly granularity without throwing", () => {
        expect(() =>
            render(<RegistrationTrendChart data={SAMPLE} granularity="monthly" />),
        ).not.toThrow();
    });

    it("renders without throwing for an empty dataset", () => {
        expect(() =>
            render(<RegistrationTrendChart data={[]} granularity="weekly" />),
        ).not.toThrow();
    });
});
