import { IDLE_LIMIT_MS, IDLE_WARNING_MS, idleState } from './idle.service';

describe('idleState', () => {
  const t0 = 1_000_000;

  it('stays active until the warning window', () => {
    expect(idleState(t0, t0)).toEqual({ kind: 'active' });
    expect(idleState(t0, t0 + IDLE_LIMIT_MS - IDLE_WARNING_MS - 1)).toEqual({ kind: 'active' });
  });

  it('warns with the seconds left during the last two minutes', () => {
    expect(idleState(t0, t0 + IDLE_LIMIT_MS - IDLE_WARNING_MS)).toEqual({
      kind: 'warning',
      secondsLeft: 120,
    });
    expect(idleState(t0, t0 + IDLE_LIMIT_MS - 500)).toEqual({ kind: 'warning', secondsLeft: 1 });
  });

  it('expires after 30 minutes without activity', () => {
    expect(idleState(t0, t0 + IDLE_LIMIT_MS)).toEqual({ kind: 'expired' });
  });
});
