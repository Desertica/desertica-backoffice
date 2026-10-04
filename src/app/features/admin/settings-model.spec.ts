import { fromRows, toRows } from './settings-model';

describe('settings model', () => {
  it('round-trips typed values', () => {
    const original = {
      holdMinutes: 15,
      sendEmails: true,
      brand: 'Desertica',
      templates: { en: 'Hi' },
    };
    const rows = toRows(original);
    expect(rows.map((r) => r.type)).toEqual(['string', 'number', 'boolean', 'json']);
    expect(fromRows(rows)).toEqual({ value: original });
  });

  it('reports the first invalid row', () => {
    expect(fromRows([{ key: 'a', type: 'number', text: 'x' }])).toEqual({
      error: 'invalidNumber',
      index: 0,
    });
    expect(fromRows([{ key: 'a', type: 'number', text: '' }])).toEqual({
      error: 'invalidNumber',
      index: 0,
    });
    expect(fromRows([{ key: 'a', type: 'json', text: '{' }])).toEqual({
      error: 'invalidJson',
      index: 0,
    });
    expect(
      fromRows([
        { key: 'a', type: 'string', text: '1' },
        { key: ' a ', type: 'string', text: '2' },
      ]),
    ).toEqual({ error: 'duplicateKey', index: 1 });
    expect(fromRows([{ key: ' ', type: 'string', text: '' }])).toEqual({
      error: 'emptyKey',
      index: 0,
    });
  });
});
