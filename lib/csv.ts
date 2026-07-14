/**
 * CSV utilities.
 *
 * `toCsv(rows, columns)` — serialise a typed dataset to a CSV string where
 * the first row is the column header. Values are quoted when they contain
 * commas, double-quotes, or newlines; double-quotes inside values are
 * escaped by doubling them (RFC 4180).
 *
 * `parseCsv(text)` — parse a CSV string back into an array of objects keyed
 * by the header row. The inverse of `toCsv` for the same column set.
 *
 * Validates: Requirements 31.4, 31.6 (CSV export round-trip, Property 20).
 */

export interface CsvColumn<T> {
  /** Column header label. */
  header: string;
  /** Extract the cell value from a row. Returns a string or number. */
  accessor: (row: T) => string | number | null | undefined;
}

/**
 * Escape a single cell value per RFC 4180:
 *   - Wrap in double-quotes if the value contains a comma, double-quote,
 *     or newline.
 *   - Escape embedded double-quotes by doubling them.
 */
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialise `rows` to a CSV string using `columns` to define the header
 * and cell accessors. The first row of the output is always the header.
 *
 * Validates: Requirements 31.4, 31.6.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) =>
      columns.map((c) => escapeCell(c.accessor(row))).join(","),
    )
    .join("\n");
  return body.length > 0 ? `${header}\n${body}` : header;
}

/**
 * Parse a CSV string produced by `toCsv` back into an array of plain
 * objects. The first row is treated as the header; subsequent rows are
 * mapped to objects keyed by the header values.
 *
 * Handles RFC 4180 quoting (quoted fields, doubled double-quotes).
 *
 * Validates: Requirements 31.4, 31.6 (round-trip, Property 20).
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = splitLines(text);
  if (lines.length === 0) return [];

  const headers = parseRow(lines[0]);
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const cells = parseRow(line);
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j] ?? "";
    }
    result.push(obj);
  }

  return result;
}

/** Split CSV text into logical lines, respecting quoted newlines. */
function splitLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/** Parse a single CSV row into an array of cell strings. */
function parseRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}
