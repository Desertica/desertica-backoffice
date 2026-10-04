import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv([['a,b', 'say "hi"', 'x\ny']])).toBe('"a,b","say ""hi""","x\ny"');
  });

  it('neutralises spreadsheet formulas in text but keeps negative numbers', () => {
    expect(toCsv([['=HYPERLINK("x")', '@cmd', -5, null]])).toBe(`"'=HYPERLINK(""x"")",'@cmd,-5,`);
  });
});
