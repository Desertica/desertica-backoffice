import { IdempotencyKeys } from './idempotency';

describe('IdempotencyKeys', () => {
  it('keeps the key for the same payload and renews it when the payload changes', () => {
    const keys = new IdempotencyKeys();
    const first = keys.keyFor({ amountCents: 100 });
    expect(keys.keyFor({ amountCents: 100 })).toBe(first);
    const second = keys.keyFor({ amountCents: 200 });
    expect(second).not.toBe(first);
    expect(keys.keyFor({ amountCents: 200 })).toBe(second);
  });
});
