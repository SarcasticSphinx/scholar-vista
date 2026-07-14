// @vitest-environment jsdom

/**
 * Unit tests for the dashboard `RoleBadge` component.
 *
 * Validates: Requirements 19.1, 19.3 (role displayed in list + detail).
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RoleBadge } from "./role-badge";

afterEach(() => cleanup());

describe("RoleBadge", () => {
    it("renders the Admin label", () => {
        render(<RoleBadge role="ADMIN" />);
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("renders the Moderator label", () => {
        render(<RoleBadge role="MODERATOR" />);
        expect(screen.getByText("Moderator")).toBeInTheDocument();
    });

    it("renders the User label", () => {
        render(<RoleBadge role="USER" />);
        expect(screen.getByText("User")).toBeInTheDocument();
    });
});
