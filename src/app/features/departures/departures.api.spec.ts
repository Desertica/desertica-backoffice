import { TestBed } from '@angular/core/testing';
import { ApiClient } from '../../core/api/api-client';
import { DeparturesApi, upcomingRange } from './departures.api';

describe('DeparturesApi.listAll', () => {
  const page = (n: number, total: number) => ({
    data: {
      data: Array.from({ length: n }, (_, i) => ({ id: `${i}`, startsAt: '2026-01-01' })),
      meta: { page: 1, pageSize: 100, total },
    },
    response: { ok: true },
  });
  const make = (get: ReturnType<typeof vi.fn>) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: { http: { GET: get } } }],
    });
    return TestBed.inject(DeparturesApi);
  };

  it('is not truncated when every row was fetched', async () => {
    const res = await make(vi.fn().mockResolvedValue(page(3, 3))).listAll({});
    expect(res.items).toHaveLength(3);
    expect(res.truncated).toBe(false);
  });

  it('reports truncation when the page limit is hit before the total', async () => {
    const res = await make(vi.fn().mockResolvedValue(page(100, 5000))).listAll({});
    expect(res.items).toHaveLength(1000);
    expect(res.truncated).toBe(true);
  });

  it('bounds pickers to one year ahead', () => {
    const { from, to } = upcomingRange(new Date('2026-01-01T00:00:00Z'));
    expect(from).toBe('2026-01-01T00:00:00.000Z');
    expect(to).toBe('2027-01-01T00:00:00.000Z');
  });
});
