// @vitest-environment jsdom

/**
 * Smoke tests for the `ApplicationsTrendChart` client component. Recharts
 * needs a sized container to draw its SVG, which jsdom does not provide, so
 * these tests assert the component mounts without throwing and renders its
 * responsive wrapper rather than inspecting the SVG geometry.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ApplicationsTrendChart } from "./applications-trend-chart";

afterEach(() => cleanup());

const SAMPLE = [
    { monthIso: "2024-01-01T00:00:00.000Z", count: 3 },
    { monthIso: "2024-02-01T00:00:00.000Z", count: 7 },
    { monthIso: "2024-03-01T00:00:00.000Z", count: 0 },
];

describe("ApplicationsTrendChart", () => {
    it("renders the responsive wrapper for valid data", () => {
        const { container } = render(<ApplicationsTrendChart data={SAMPLE} />);
        expect(
            container.querySelector('[data-slot="applications-trend-chart"]'),
        ).toBeInTheDocument();
    });

    it("renders without throwing for an empty series", () => {
        expect(() => render(<ApplicationsTrendChart data={[]} />)).not.toThrow();
    });

    it("applies the requested height to the wrapper", () => {
        const { container } = render(
            <ApplicationsTrendChart data={SAMPLE} height={240} />,
        );
        const wrapper = container.querySelector(
            '[data-slot="applications-trend-chart"]',
        ) as HTMLElement | null;
        expect(wrapper?.style.height).toBe("240px");
    });
});
