// @vitest-environment jsdom

/**
 * Smoke tests for the `ApplicationStatusChart` client component. Recharts
 * cannot lay out inside jsdom, so these tests assert the component mounts
 * and renders its responsive wrapper for valid, empty, and partial data.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ApplicationStatusChart } from "./application-status-chart";

afterEach(() => cleanup());

const SAMPLE = [
    { status: "PENDING", count: 4 },
    { status: "PROCESSING", count: 2 },
    { status: "COMPLETED", count: 9 },
    { status: "REJECTED", count: 1 },
];

describe("ApplicationStatusChart", () => {
    it("renders the responsive wrapper for valid data", () => {
        const { container } = render(<ApplicationStatusChart data={SAMPLE} />);
        expect(
            container.querySelector('[data-slot="application-status-chart"]'),
        ).toBeInTheDocument();
    });

    it("renders without throwing for an empty dataset", () => {
        expect(() => render(<ApplicationStatusChart data={[]} />)).not.toThrow();
    });

    it("applies the requested height to the wrapper", () => {
        const { container } = render(
            <ApplicationStatusChart data={SAMPLE} height={280} />,
        );
        const wrapper = container.querySelector(
            '[data-slot="application-status-chart"]',
        ) as HTMLElement | null;
        expect(wrapper?.style.height).toBe("280px");
    });
});
