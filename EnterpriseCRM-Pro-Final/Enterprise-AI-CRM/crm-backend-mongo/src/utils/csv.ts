/* ============================================================
   CSV (RFC 4180) — small, dependency-free
============================================================ */

/**
 * Parses CSV text into rows of cells. Handles quoted fields,
 * escaped quotes (""), commas and newlines inside quotes, CRLF
 * and a leading UTF-8 BOM. Blank lines are skipped.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim().length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field');
  }

  row.push(cell);
  if (row.some(value => value.trim().length > 0)) rows.push(row);

  return rows;
}

/**
 * Spreadsheet apps execute cells starting with = + - @ (and tab /
 * carriage return) as formulas. Prefix them with an apostrophe so
 * exported data can never run as a formula ("CSV injection").
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = neutralizeFormula(
    value instanceof Date ? value.toISOString() : String(value),
  );
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds CSV text (with BOM so Excel opens UTF-8 correctly). */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map(row => row.map(escapeCell).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/**
 * Turns parsed rows into objects keyed by normalised header
 * names ("Assigned To Email" → "assignedtoemail").
 */
export function rowsToRecords(rows: string[][]): { header: string[]; records: Record<string, string>[] } {
  const [headerRow, ...body] = rows;
  if (!headerRow) return { header: [], records: [] };

  const header = headerRow.map(name => name.trim().toLowerCase().replace(/[\s_-]+/g, ''));

  const records = body.map(cells => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      if (key) record[key] = (cells[index] ?? '').trim();
    });
    return record;
  });

  return { header, records };
}
