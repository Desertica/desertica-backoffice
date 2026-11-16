import { toForm, toInput } from './settings-model';

const loaded = toForm({
  depositPercent: 30,
  holdMinutes: 15,
  operatorRefundLimitCents: 20000,
  complaintDueDays: 15,
  availabilityMonths: 3,
  adultsMin: 1,
  childrenMin: 0,
  peopleMax: 12,
});

describe('settings model', () => {
  it('shows money in units and the rest as plain numbers', () => {
    expect(loaded).toEqual({
      depositPercent: '30',
      holdMinutes: '15',
      operatorRefundLimitCents: '200.00',
      complaintDueDays: '15',
      availabilityMonths: '3',
      adultsMin: '1',
      childrenMin: '0',
      peopleMax: '12',
    });
  });

  it('sends only what changed, money back in cents', () => {
    expect(
      toInput({ ...loaded, holdMinutes: '20', operatorRefundLimitCents: '150,50' }, loaded),
    ).toEqual({
      value: { holdMinutes: 20, operatorRefundLimitCents: 15050 },
    });
    expect(toInput(loaded, loaded)).toEqual({ value: {} });
  });

  it('rejects malformed and out-of-range values with the offending field', () => {
    expect(toInput({ ...loaded, holdMinutes: 'x' }, loaded)).toEqual({
      error: 'invalidNumber',
      key: 'holdMinutes',
    });
    expect(toInput({ ...loaded, depositPercent: '101' }, loaded)).toEqual({
      error: 'outOfRange',
      key: 'depositPercent',
    });
    expect(toInput({ ...loaded, holdMinutes: '0' }, loaded)).toEqual({
      error: 'outOfRange',
      key: 'holdMinutes',
    });
    expect(toInput({ ...loaded, complaintDueDays: '61' }, loaded)).toEqual({
      error: 'outOfRange',
      key: 'complaintDueDays',
    });
  });

  it('validates the web booking rules with the ranges of the contract', () => {
    expect(
      toInput(
        { ...loaded, availabilityMonths: '12', adultsMin: '2', childrenMin: '1', peopleMax: '20' },
        loaded,
      ),
    ).toEqual({ value: { availabilityMonths: 12, adultsMin: 2, childrenMin: 1, peopleMax: 20 } });
    for (const [key, bad] of [
      ['availabilityMonths', '0'],
      ['availabilityMonths', '13'],
      ['adultsMin', '0'],
      ['childrenMin', '21'],
      ['peopleMax', '21'],
    ] as const) {
      expect(toInput({ ...loaded, [key]: bad }, loaded)).toEqual({ error: 'outOfRange', key });
    }
    expect(toInput({ ...loaded, peopleMax: '1.5' }, loaded)).toEqual({
      error: 'invalidNumber',
      key: 'peopleMax',
    });
  });
});
