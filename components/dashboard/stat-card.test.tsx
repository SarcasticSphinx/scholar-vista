// @vitest-environment jsdom

/**
 * Unit tests for the dashboard `StatCard` presentational component.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { StatCard } from "./stat-card";

afterEach(() => cleanup());

describe("StatCard", () => {
    it("renders the label and value", () => {
        render(<StatCard label="Total Users" value="1,234" />);
        expect(screen.getByText("Total Users")).toBeInTheDocument();
        expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("renders numeric values as-is", () => {
        render(<StatCard label="Applications" value={42} />);
        expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders the optional description", () => {
        render(
            <StatCard label="Scholarships" value="12" description="Approved only" />,
        );
        expect(screen.getByText("Approved only")).toBeInTheDocument();
    });

    it("renders a trend chip when provided", () => {
        render(
            <StatCard
                label="Universities"
                value="5"
                trend={{ label: "+2 this month", direction: "up" }}
            />,
        );
        expect(screen.getByText("+2 this month")).toBeInTheDocument();
    });

    it("renders without a trend or description by default", () => {
        render(<StatCard label="Pending" value="3" />);
        expect(screen.getByText("Pending")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders an icon when supplied", () => {
        const { container } = render(
            <StatCard label="Users" value="10" icon={Users} />,
        );
        // Lucide renders an <svg> element inside the header.
        expect(container.querySelector("svg")).toBeTruthy();
    });
});
