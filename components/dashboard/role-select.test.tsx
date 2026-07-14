// @vitest-environment jsdom

/**
 * Unit tests for the dashboard `RoleSelect` client island.
 *
 * Focus is on the access-gating behaviour the design mandates:
 *   - The control is disabled when the viewer is not an admin (`disabled`).
 *   - The control is disabled on the admin's own row (`isSelf`) — admins
 *     may not change their own role (Req 19.2).
 *   - Otherwise the control is enabled and shows the current role.
 *
 * Validates: Requirements 19.2, 19.4, 19.5.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RoleSelect } from "./role-select";

// The action and toast are side-effecting; stub them so the component
// renders in isolation without a server or DOM toast portal.
vi.mock("@/actions/user", () => ({
    changeRole: vi.fn(),
}));
vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => cleanup());

describe("RoleSelect", () => {
    it("renders the current role label", () => {
        render(<RoleSelect userId="u1" currentRole="MODERATOR" />);
        expect(screen.getByText("Moderator")).toBeInTheDocument();
    });

    it("is enabled for an admin viewing another user's row", () => {
        render(<RoleSelect userId="u1" currentRole="USER" />);
        expect(screen.getByRole("combobox")).toBeEnabled();
    });

    it("is disabled when the viewer lacks permission", () => {
        render(<RoleSelect userId="u1" currentRole="USER" disabled />);
        expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("is disabled on the signed-in admin's own row", () => {
        render(<RoleSelect userId="self" currentRole="ADMIN" isSelf />);
        const trigger = screen.getByRole("combobox");
        expect(trigger).toBeDisabled();
        expect(trigger).toHaveAttribute(
            "title",
            "You cannot change your own role",
        );
    });
});
