"use client";

/**
 * "Export CSV" button for the admin Reports page (client island).
 *
 * Serialises the currently-displayed report data to CSV and triggers a
 * client-side download. The generated file contains a header row followed
 * by data rows that match the on-screen report view (Requirement 31.6):
 *   - a section per dataset (application stats by status, by category, and
 *     the registration trend), each with its own `key,value` columns.
 *
 * This uses a minimal, dependency-free CSV serialiser so the Reports page
 * is self-contained. Task 21.2 introduces the shared `lib/csv.ts`
 * (`toCsv`/`parseCsv`) and the round-trip property test; this component can
 * be refactored to consume that util once it lands.
 *
 * Validates: Requirements 31.4, 31.6.
 */

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A single `(label, value)` pair to render as a CSV row. */
export interface ReportRow {
    label: string;
    value: number;
}

/** A named CSV section. */
export interface ReportSection {
    /** Human-readable section name, emitted as a comment-style separator. */
    title: string;
    /** Header for the first ("label") column, e.g. `"Status"`. */
    keyHeader: string;
    rows: ReportRow[];
}

export interface ExportReportButtonProps {
    /** Sections to serialise, in display order. */
    sections: ReportSection[];
    /** Window metadata included in the filename. */
    start: string;
    end: string;
    /** Disable the control (e.g. when there is nothing to export). */
    disabled?: boolean;
    className?: string;
}

/**
 * Escape a single CSV field per RFC 4180: wrap in quotes when the value
 * contains a comma, quote, or newline, doubling any embedded quotes.
 */
function escapeField(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/** Build the CSV text for the supplied sections. */
function buildCsv(sections: ReportSection[]): string {
    const lines: string[] = [];
    sections.forEach((section, index) => {
        if (index > 0) lines.push("");
        lines.push(escapeField(section.title));
        lines.push(`${escapeField(section.keyHeader)},${escapeField("Count")}`);
        for (const row of section.rows) {
            lines.push(`${escapeField(row.label)},${escapeField(String(row.value))}`);
        }
    });
    return lines.join("\r\n");
}

export function ExportReportButton({
    sections,
    start,
    end,
    disabled,
    className,
}: ExportReportButtonProps) {
    const onExport = React.useCallback(() => {
        const csv = buildCsv(sections);
        // Prepend a UTF-8 BOM so spreadsheet apps detect the encoding.
        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `scholarvista-report_${start}_to_${end}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, [sections, start, end]);

    return (
        <Button
            type="button"
            variant="outline"
            onClick={onExport}
            disabled={disabled}
            className={className}
        >
            <Download aria-hidden="true" className="size-4" />
            Export CSV
        </Button>
    );
}

export default ExportReportButton;
