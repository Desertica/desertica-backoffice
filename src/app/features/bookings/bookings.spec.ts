import { buildManualBooking, idDocNumberError, type ManualBookingForm } from './manual-booking';
import { allowedActions, documentNumber, pendingCents } from './booking-detail';
import { buildManualPayment, rescheduleTargets } from './booking-dialogs';
import { toBookingQuery } from './bookings-page';
import type { Departure } from '../../core/api/types';

const form: ManualBookingForm = {
  departureId: 'd1',
  currency: 'PEN',
  adults: 2,
  children: 1,
  customer: {
    firstName: ' Ana ',
    lastName: 'Ríos',
    email: ' ana@x.pe ',
    phone: '',
    country: 'pe',
    idDocType: 'DNI',
    idDocNumber: '12345678',
  },
  billingSame: true,
  billing: { docType: 'BOLETA', name: '', idDocType: 'DNI', idDocNumber: '', address: '' },
  passengers: [{ firstName: '', lastName: '', idDocType: 'DNI', idDocNumber: '' }],
  deposit: '50.5',
  override: '',
  notes: '',
  sendConfirmation: true,
};

describe('booking filters', () => {
  it('passes the new filters through and drops unknown values', () => {
    expect(
      toBookingQuery({
        paymentStatus: 'UNPAID',
        source: 'MANUAL',
        waiver: 'PENDING',
        currency: 'PEN',
      }),
    ).toMatchObject({
      paymentStatus: 'UNPAID',
      source: 'MANUAL',
      waiverStatus: 'PENDING',
      currency: 'PEN',
    });
    const q = toBookingQuery({ paymentStatus: 'x', source: 'y', waiver: 'z', currency: 'EUR' });
    expect(q.paymentStatus ?? q.source ?? q.waiverStatus ?? q.currency).toBeUndefined();
  });
});

describe('manual booking', () => {
  it('builds the body: trims, uppercases country, converts money to cents, drops empty passengers', () => {
    const body = buildManualBooking(form);
    expect(body).toMatchObject({
      departureId: 'd1',
      currency: 'PEN',
      depositCents: 5050,
      customer: {
        firstName: 'Ana',
        email: 'ana@x.pe',
        country: 'PE',
        idDocType: 'DNI',
        idDocNumber: '12345678',
      },
      billing: { docType: 'BOLETA', name: 'Ana Ríos', idDocNumber: '12345678' },
    });
    expect(body).not.toHaveProperty('passengers');
    expect(body).not.toHaveProperty('overrideTotalCents');
  });

  it('rejects invalid money', () => {
    expect(buildManualBooking({ ...form, deposit: '5,555' })).toBe('invalidMoney');
    expect(buildManualBooking({ ...form, override: 'abc' })).toBe('invalidMoney');
  });

  it('validates DNI and RUC lengths', () => {
    expect(idDocNumberError('DNI', '12345678')).toBeNull();
    expect(idDocNumberError('DNI', '1234')).toBe('invalid');
    expect(idDocNumberError('RUC', '20123456789')).toBeNull();
    expect(idDocNumberError('PASSPORT', 'X123')).toBeNull();
    expect(idDocNumberError('CE', '')).toBe('invalid');
  });
});

describe('booking helpers', () => {
  it('formats document numbers and pending amounts', () => {
    expect(documentNumber({ series: 'B001', number: 12 })).toBe('B001-00000012');
    expect(pendingCents({ totalCents: 10000, paidCents: 4000 })).toBe(6000);
    expect(pendingCents({ totalCents: 10000, paidCents: 12000 })).toBe(0);
  });

  it('only offers actions that fit the status', () => {
    expect(allowedActions('CONFIRMED')).toMatchObject({
      cancel: true,
      markStatus: true,
      issue: true,
    });
    expect(allowedActions('PENDING_PAYMENT')).toMatchObject({
      cancel: true,
      markStatus: false,
      issue: false,
    });
    expect(allowedActions('CANCELLED')).toMatchObject({
      cancel: false,
      collect: false,
      issue: false,
    });
  });

  it('builds manual payments in the booking currency and Lima time', () => {
    const body = buildManualPayment(
      {
        method: 'YAPE',
        kind: 'DEPOSIT',
        amount: '30',
        reference: ' 123 ',
        paidAt: '2026-10-04T10:00',
      },
      'PEN',
    );
    expect(body).toEqual({
      method: 'YAPE',
      kind: 'DEPOSIT',
      amountCents: 3000,
      currency: 'PEN',
      reference: '123',
      paidAt: '2026-10-04T15:00:00.000Z',
    });
    expect(
      buildManualPayment(
        { method: 'CASH', kind: 'FULL', amount: '0', reference: '', paidAt: '' },
        'USD',
      ),
    ).toBeNull();
  });

  it('lists only open departures with room for the whole party, excluding the current one', () => {
    const d = (id: string, sold: number, status: Departure['status'] = 'OPEN'): Departure =>
      ({
        id,
        tourRefId: 't',
        startsAt: '2026-10-10T13:00:00Z',
        capacity: 10,
        seatsSold: sold,
        format: 'SHARED',
        language: 'es',
        status,
      }) as Departure;
    const ids = rescheduleTargets(
      [d('cur', 2), d('a', 6), d('b', 8), d('c', 0, 'CLOSED')],
      'cur',
      3,
    ).map((x) => x.id);
    expect(ids).toEqual(['a']);
  });
});

describe('bookings list query', () => {
  it('maps URL filters to API params with Lima day boundaries', () => {
    expect(
      toBookingQuery({
        status: 'CONFIRMED',
        q: ' ana ',
        from: '2026-10-01',
        to: '2026-10-31',
        page: '3',
      }),
    ).toEqual({
      page: 3,
      pageSize: 25,
      status: 'CONFIRMED',
      q: 'ana',
      from: '2026-10-01T05:00:00.000Z',
      to: '2026-11-01T05:00:00.000Z',
    });
  });

  it('ignores unknown statuses and bad pages', () => {
    expect(toBookingQuery({ status: 'HACKED', page: '-2' })).toEqual({ page: 1, pageSize: 25 });
  });
});
