export type SettingType = 'string' | 'number' | 'boolean' | 'json';

export interface SettingRow {
  key: string;
  type: SettingType;
  /** Raw text as typed; for booleans 'true' | 'false'. */
  text: string;
}

/** The API's settings object is free-form; each value becomes an editable row typed by what it holds. */
export function toRows(settings: Record<string, unknown>): SettingRow[] {
  return Object.entries(settings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      if (typeof value === 'number') return { key, type: 'number', text: String(value) };
      if (typeof value === 'boolean') return { key, type: 'boolean', text: String(value) };
      if (typeof value === 'string') return { key, type: 'string', text: value };
      return { key, type: 'json', text: JSON.stringify(value, null, 2) };
    });
}

export type RowError = 'invalidNumber' | 'invalidJson' | 'duplicateKey' | 'emptyKey';

/** Rows back to the object the API expects, or the first problem found (with the offending row index). */
export function fromRows(
  rows: readonly SettingRow[],
): { value: Record<string, unknown> } | { error: RowError; index: number } {
  const out: Record<string, unknown> = {};
  for (const [index, row] of rows.entries()) {
    const key = row.key.trim();
    if (!key) return { error: 'emptyKey', index };
    if (key in out) return { error: 'duplicateKey', index };
    switch (row.type) {
      case 'string':
        out[key] = row.text;
        break;
      case 'boolean':
        out[key] = row.text === 'true';
        break;
      case 'number': {
        const n = Number(row.text);
        if (row.text.trim() === '' || !Number.isFinite(n)) return { error: 'invalidNumber', index };
        out[key] = n;
        break;
      }
      case 'json':
        try {
          out[key] = JSON.parse(row.text);
        } catch {
          return { error: 'invalidJson', index };
        }
        break;
    }
  }
  return { value: out };
}
