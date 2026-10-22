/**
 * CSV for spreadsheet export. Cells starting with `= + - @` are prefixed with a quote so a
 * passenger name cannot run as a formula when the file is opened in Excel.
 */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

function cell(value: string | number | null | undefined): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value !== 'number') s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel reads UTF-8 (accents in names).
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
