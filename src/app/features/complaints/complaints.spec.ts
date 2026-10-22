import type { Complaint } from '../../core/api/types';
import { dueSoon } from './complaints.api';

describe('dueSoon', () => {
  const now = Date.parse('2026-10-10T00:00:00Z');
  const c = (id: number, status: string, dueAt: string) => ({ id, status, dueAt }) as Complaint;

  it('keeps unanswered complaints due within 3 days or overdue, oldest first', () => {
    const items = [
      c(1, 'OPEN', '2026-10-12T00:00:00Z'),
      c(2, 'IN_PROGRESS', '2026-10-05T00:00:00Z'),
      c(3, 'OPEN', '2026-10-20T00:00:00Z'),
      c(4, 'ANSWERED', '2026-10-01T00:00:00Z'),
    ];
    expect(dueSoon(items, now).map((x) => x.id)).toEqual([2, 1]);
  });
});
