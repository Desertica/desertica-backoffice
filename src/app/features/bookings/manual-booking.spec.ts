import { signal } from '@angular/core';
import { FormControl, type FormGroup } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiClient } from '../../core/api/api-client';
import { TourCatalog } from '../../core/api/tour-catalog';
import { AuthService } from '../../core/auth/auth.service';
import { Notify } from '../../shared/notify';
import { wholeNumber } from '../../shared/validators';
import { DeparturesApi } from '../departures/departures.api';
import { BookingsApi } from './bookings.api';
import { ManualBooking, billingFromCustomer } from './manual-booking';

describe('manual booking form', () => {
  const post = vi.fn();

  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: { totalCents: 100 }, response: { ok: true } });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ApiClient, useValue: { http: { POST: post } } },
        { provide: TourCatalog, useValue: { load: async () => [], tours: signal([]) } },
        {
          provide: DeparturesApi,
          useValue: { listAll: async () => ({ items: [], truncated: false }) },
        },
        { provide: BookingsApi, useValue: {} },
        { provide: AuthService, useValue: { has: () => false } },
        { provide: Notify, useValue: { error: vi.fn() } },
      ],
    });
  });

  it('drops the departure and its quote when the tour changes', async () => {
    const c = TestBed.createComponent(ManualBooking).componentInstance as unknown as {
      form: FormGroup;
      quoteParams: () => unknown;
    };
    const form = c.form;
    form.patchValue({ tourRefId: 't1' });
    form.patchValue({ departureId: 'd1' });
    expect(c.quoteParams()).toMatchObject({ departureId: 'd1' });
    form.patchValue({ tourRefId: 't2' });
    expect(form.value.departureId).toBe('');
    expect(c.quoteParams()).toBeUndefined();
  });

  it('forces the company data for a factura', () => {
    const c = TestBed.createComponent(ManualBooking).componentInstance as unknown as {
      form: FormGroup;
      billingSame: () => boolean;
    };
    expect(c.billingSame()).toBe(true);
    c.form.get('billing.docType')!.setValue('FACTURA');
    expect(c.billingSame()).toBe(false);
    expect(c.form.get('billingSame')!.disabled).toBe(true);
    c.form.get('billing.docType')!.setValue('BOLETA');
    expect(c.form.get('billingSame')!.enabled).toBe(true);
  });

  it('never reuses the customer for a factura', () => {
    const billing = { docType: 'FACTURA' } as never;
    expect(billingFromCustomer({ billingSame: true, billing })).toBe(false);
    expect(
      billingFromCustomer({ billingSame: true, billing: { docType: 'BOLETA' } as never }),
    ).toBe(true);
  });

  it('accepts only whole numbers', () => {
    expect(wholeNumber(new FormControl(2))).toBeNull();
    expect(wholeNumber(new FormControl(1.5))).toEqual({ integer: true });
  });
});
