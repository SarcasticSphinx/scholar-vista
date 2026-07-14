// @vitest-environment jsdom

/**
 * Tests for the `ExportReportButton` client component.
 *
 * Verify it renders, and that clicking serialises the supplied sections to
 * CSV (header row + data rows matching the displayed view, Req 31.6) and
 * triggers a client-side download (Req 31.4). `URL.createObjectURL` is
 * stubbed so we can capture the generated Blob and read its CSV text.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    ExportReportButton,
    type ReportSection,
} from "./export-report-button";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const SECTIONS: ReportSection[] = [
    {
        title: "Applications by status",
        keyHeader: "Status",
        rows: [
            { label: "Pending", value: 4 },
            { label: "Completed", value: 9 },
        ],
    },
    {
        title: "Registrations (daily)",
        keyHeader: "Period",
        rows: [{ label: "2024-01-01T00:00:00.000Z", value: 3 }],
    },
];

describe("ExportReportButton", () => {
    it("renders an Export CSV button", () => {
        render(
            <ExportReportButton sections={SECTIONS} start="2024-01-01" end="2024-01-31" />,
        );
        expect(
            screen.getByRole("button", { name: /export csv/i }),
        ).toBeInTheDocument();
    });

    it("serialises sections to CSV and triggers a download on click", async () => {
        const user = userEvent.setup();
        let captured: Blob | null = null;
        const createObjectURL = vi
            .spyOn(URL, "createObjectURL")
            .mockImplementation((obj: Blob | MediaSource) => {
                captured = obj as Blob;
                return "blob:mock";
            });
        const revokeObjectURL = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation(() => { });

        render(
            <ExportReportButton sections={SECTIONS} start="2024-01-01" end="2024-01-31" />,
        );
        await user.click(screen.getByRole("button", { name: /export csv/i }));

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledTimes(1);
        expect(captured).not.toBeNull();

        const text = await (captured as unknown as Blob).text();
        // Header + data rows present (Req 31.6).
        expect(text).toContain("Status,Count");
        expect(text).toContain("Pending,4");
        expect(text).toContain("Completed,9");
        expect(text).toContain("Period,Count");
        expect(text).toContain("2024-01-01T00:00:00.000Z,3");
    });

    it("disables the button when disabled is set", () => {
        render(
            <ExportReportButton
                sections={SECTIONS}
                start="2024-01-01"
                end="2024-01-31"
                disabled
            />,
        );
        expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
    });
});
