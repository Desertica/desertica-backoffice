import { SERIES_PREFIX, buildCompany } from './admin/company-page';
import { dueState } from './complaints/complaints-page';
import { documentNumber } from './documents/document-dialogs';
import { documentActions, toDocumentQuery } from './documents/documents-page';
import { evidenceUrgency } from './payments/disputes-page';
import { toPaymentQuery } from './payments/payments-page';
import { parseRefundAmount, refundableCents } from './payments/refund-dialog';

const DAY = 86_400_000;

describe('refunds', () => {
  it('only succeeded payments are refundable, net of what was already returned', () => {
    expect(refundableCents({ status: 'SUCCEEDED', amountCents: 10000, refundedCents: 0 })).toBe(
      10000,
    );
    expect(
      refundableCents({ status: 'PARTIALLY_REFUNDED', amountCents: 10000, refundedCents: 2500 }),
    ).toBe(7500);
    expect(refundableCents({ status: 'REFUNDED', amountCents: 10000, refundedCents: 10000 })).toBe(
      0,
    );
    expect(refundableCents({ status: 'PENDING', amountCents: 10000 })).toBe(0);
  });

  it('accepts only positive amounts up to the refundable maximum', () => {
    expect(parseRefundAmount('25.50', 10000)).toBe(2550);
    expect(parseRefundAmount('100.01', 10000)).toBeNull();
    expect(parseRefundAmount('0', 10000)).toBeNull();
    expect(parseRefundAmount('abc', 10000)).toBeNull();
  });
});

describe('deadlines', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');
  it('flags disputes whose evidence is overdue or due within 3 days, only while open', () => {
    expect(evidenceUrgency('OPEN', new Date(now - DAY).toISOString(), now)).toBe('overdue');
    expect(evidenceUrgency('OPEN', new Date(now + 2 * DAY).toISOString(), now)).toBe('soon');
    expect(evidenceUrgency('OPEN', new Date(now + 10 * DAY).toISOString(), now)).toBeNull();
    expect(evidenceUrgency('WON', new Date(now - DAY).toISOString(), now)).toBeNull();
    expect(evidenceUrgency('OPEN', null, now)).toBeNull();
  });

  it('flags complaints overdue or due within 5 days until answered', () => {
    expect(dueState('OPEN', new Date(now - 1).toISOString(), now)).toBe('overdue');
    expect(dueState('IN_PROGRESS', new Date(now + 4 * DAY).toISOString(), now)).toBe('soon');
    expect(dueState('OPEN', new Date(now + 20 * DAY).toISOString(), now)).toBeNull();
    expect(dueState('ANSWERED', new Date(now - DAY).toISOString(), now)).toBeNull();
  });
});

describe('documents', () => {
  it('formats the printed number', () => {
    expect(documentNumber({ series: 'F001', number: 7 })).toBe('F001-00000007');
  });

  it('offers actions by status and type', () => {
    expect(documentActions({ status: 'ERROR', docType: 'BOLETA' })).toEqual({
      retry: true,
      void: false,
      creditNote: false,
    });
    expect(documentActions({ status: 'ACCEPTED', docType: 'FACTURA' })).toEqual({
      retry: false,
      void: true,
      creditNote: true,
    });
    expect(documentActions({ status: 'ACCEPTED', docType: 'NOTA_CREDITO' })).toEqual({
      retry: false,
      void: false,
      creditNote: false,
    });
    expect(documentActions({ status: 'VOIDED', docType: 'BOLETA' })).toEqual({
      retry: false,
      void: false,
      creditNote: false,
    });
  });

  it('maps URL filters to the API query', () => {
    expect(
      toDocumentQuery({ status: 'ERROR', docType: 'BOLETA', from: '2026-10-01', page: '2' }),
    ).toEqual({
      page: 2,
      pageSize: 25,
      status: 'ERROR',
      docType: 'BOLETA',
      from: '2026-10-01T05:00:00.000Z',
    });
    expect(toDocumentQuery({ status: 'NOPE', docType: 'X' })).toEqual({ page: 1, pageSize: 25 });
  });
});

describe('payments query', () => {
  it('validates enums and uses Lima day bounds', () => {
    expect(toPaymentQuery({ status: 'SUCCEEDED', provider: 'CULQI', to: '2026-10-31' })).toEqual({
      page: 1,
      pageSize: 25,
      status: 'SUCCEEDED',
      provider: 'CULQI',
      to: '2026-11-01T05:00:00.000Z',
    });
    expect(toPaymentQuery({ provider: 'PAYPAL' })).toEqual({ page: 1, pageSize: 25 });
  });
});

describe('company', () => {
  it('validates series prefixes', () => {
    for (const ok of ['B001', 'F001', 'E001', 'BC01']) expect(SERIES_PREFIX.test(ok)).toBe(true);
    for (const bad of ['X001', 'B01', 'b001', 'B0011']) expect(SERIES_PREFIX.test(bad)).toBe(false);
  });

  it('trims and omits empty optional fields', () => {
    expect(
      buildCompany({
        ruc: ' 20123456789 ',
        legalName: ' Desertica SAC ',
        tradeName: '',
        fiscalAddress: 'Ica',
        ubigeo: '',
        igvRate: '0.1800',
        environment: 'BETA',
      }),
    ).toEqual({
      ruc: '20123456789',
      legalName: 'Desertica SAC',
      fiscalAddress: 'Ica',
      environment: 'BETA',
      igvRate: '0.1800',
    });
  });
});
