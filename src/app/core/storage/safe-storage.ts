/** `sessionStorage`/`localStorage` can throw (private mode, blocked site data); never let that break the app. */
export function readStorage(kind: 'local' | 'session', key: string): string | null {
  try {
    return (kind === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(kind: 'local' | 'session', key: string, value: string | null): void {
  try {
    const store = kind === 'local' ? localStorage : sessionStorage;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    /* ignore */
  }
}
