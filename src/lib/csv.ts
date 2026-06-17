// Small, dependency-free CSV helpers used by the import/export flows.

export type CsvRow = Record<string, string | number>;

function escapeCell(value: string | number): string {
  let s = String(value ?? "");
  // CSV formula-injection guard: neutralize cells a spreadsheet would treat
  // as a formula (=, +, -, @, tab, CR) by prefixing an apostrophe.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  // Quote if the cell contains a delimiter, quote, or newline.
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(rows: CsvRow[], headers?: string[]): string {
  if (rows.length === 0) return headers ? headers.join(",") : "";
  const cols = headers ?? Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows
    .map((row) => cols.map((c) => escapeCell(row[c] ?? "")).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8"
) {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse a CSV string. Handles quoted cells, both , and ; delimiters. */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!clean) return { headers: [], rows: [] };

  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  // Detect delimiter from the header line.
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}
