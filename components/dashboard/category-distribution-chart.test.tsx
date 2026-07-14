// @vitest-environment jsdom

/**
 * Smoke tests for the `CategoryDistributionChart` client component. As with
 * the trend chart, Recharts cannot draw in jsdom (no layout), so these
 * tests assert the component mounts and renders its responsive wrapper.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CategoryDistributionChart } from "./category-distribution-chart";

afterEach(() => cleanup());

const SAMPLE = [
    { category: "UNDERGRADUATE", count: 5 },
    { category: "MASTERS", count: 8 },
    { category: "SHORT_COURSE", count: 0 },
];

describe("CategoryDistributionChart", () => {
    it("renders the responsive wrapper for valid data", () => {
        const { container } = render(<CategoryDistributionChart data={SAMPLE} />);
        expect(
            container.querySelector('[data-slot="category-distribution-chart"]'),
        ).toBeInTheDocument();
    });

    it("renders without throwing for an empty dataset", () => {
        expect(() =>
            render(<CategoryDistributionChart data={[]} />),
        ).not.toThrow();
    });

    it("applies the requested height to the wrapper", () => {
        const { container } = render(
            <CategoryDistributionChart data={SAMPLE} height={300} />,
        );
        const wrapper = container.querySelector(
            '[data-slot="category-distribution-chart"]',
        ) as HTMLElement | null;
        expect(wrapper?.style.height).toBe("300px");
    });
});
