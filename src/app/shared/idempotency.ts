/**
 * One policy for `Idempotency-Key`: the key is kept for retries of the same payload and renewed
 * as soon as the payload changes, so an edited amount is never replayed against the old key.
 */
export class IdempotencyKeys {
  private last: { payload: string; key: string } | null = null;

  keyFor(payload: unknown): string {
    const serialized = JSON.stringify(payload);
    if (this.last?.payload !== serialized) {
      this.last = { payload: serialized, key: crypto.randomUUID() };
    }
    return this.last.key;
  }
}
