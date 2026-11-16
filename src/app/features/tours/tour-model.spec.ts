import type { PriceRule, TourRef } from '../../core/api/types';
import {
  EMPTY_PRICE,
  buildPriceRule,
  buildUpdateTourRef,
  parseLanguages,
  priceToForm,
  tourToForm,
} from './tour-model';

const tour: TourRef = {
  id: 't1',
  slug: 'sandboarding',
  title: 'Sandboarding',
  active: true,
  requiresWaiver: true,
  durationHours: 3,
  format: 'BOTH',
  languages: ['es', 'en'],
  meetingPoint: { es: 'Plaza de Armas', en: 'Main square' },
  meetingPointUrl: 'https://maps.example.com/x',
  latitude: -14.08,
  longitude: -75.76,
  minAge: 8,
  minHeightCm: null,
  defaultCapacity: 12,
  cancellationPolicyId: 'p1',
};

describe('parseLanguages', () => {
  it('accepts two-letter codes separated by commas or spaces, lower-cased and without repeats', () => {
    expect(parseLanguages(' es, EN  pt,es ')).toEqual(['es', 'en', 'pt']);
    expect(parseLanguages('')).toEqual([]);
  });

  it('rejects anything that is not a two-letter code, and more than 10', () => {
    expect(parseLanguages('es, eng')).toBeNull();
    expect(parseLanguages('e1')).toBeNull();
    expect(parseLanguages('aa ab ac ad ae af ag ah ai aj ak')).toBeNull();
  });
});

describe('tour form', () => {
  it('round-trips a tour through the form', () => {
    expect(buildUpdateTourRef(tourToForm(tour))).toEqual({
      active: true,
      requiresWaiver: true,
      durationHours: 3,
      format: 'BOTH',
      languages: ['es', 'en'],
      meetingPoint: { es: 'Plaza de Armas', en: 'Main square' },
      meetingPointUrl: 'https://maps.example.com/x',
      latitude: -14.08,
      longitude: -75.76,
      minAge: 8,
      minHeightCm: null,
      defaultCapacity: 12,
      cancellationPolicyId: 'p1',
    });
  });

  it('sends null for every emptied input', () => {
    const body = buildUpdateTourRef({
      ...tourToForm(tour),
      durationHours: null,
      format: '',
      languages: ' ',
      meetingPointEs: ' ',
      meetingPointEn: '',
      meetingPointUrl: ' ',
      latitude: null,
      longitude: null,
      minAge: null,
      defaultCapacity: null,
      cancellationPolicyId: '',
    });
    expect(body).toMatchObject({
      durationHours: null,
      format: null,
      languages: [],
      meetingPoint: null,
      meetingPointUrl: null,
      latitude: null,
      longitude: null,
      minAge: null,
      defaultCapacity: null,
      cancellationPolicyId: null,
    });
  });

  it('keeps only the meeting point languages that have text', () => {
    const body = buildUpdateTourRef({ ...tourToForm(tour), meetingPointEn: '' });
    expect(body.meetingPoint).toEqual({ es: 'Plaza de Armas' });
  });
});

describe('price rule form', () => {
  const form = { ...EMPTY_PRICE, adult: '120', child: '80,5' };

  it('converts amounts to cents and empty optionals to null', () => {
    expect(buildPriceRule('t1', form)).toEqual({
      value: {
        tourRefId: 't1',
        currency: 'USD',
        format: 'SHARED',
        unit: 'PER_PERSON',
        adultCents: 12000,
        childCents: 8050,
        groupCents: null,
        minPeople: null,
        maxPeople: null,
        validFrom: null,
        validTo: null,
        priority: 0,
        active: true,
      },
    });
  });

  it('shows a stored rule back in currency units', () => {
    const rule: PriceRule = {
      id: 'r1',
      tourRefId: 't1',
      currency: 'PEN',
      unit: 'PER_GROUP',
      adultCents: 45000,
      childCents: null,
      groupCents: 150050,
      validFrom: '2026-12-01',
      priority: 2,
      active: false,
    };
    const back = priceToForm(rule);
    expect(back).toMatchObject({
      adult: '450.00',
      child: '',
      group: '1500.50',
      format: 'SHARED',
      priority: 2,
      active: false,
    });
    expect(buildPriceRule('t1', back)).toMatchObject({
      value: { currency: 'PEN', adultCents: 45000, groupCents: 150050, validFrom: '2026-12-01' },
    });
  });

  it('reports the first problem instead of a payload', () => {
    expect(buildPriceRule('t1', { ...form, adult: '' })).toEqual({ error: 'amount' });
    expect(buildPriceRule('t1', { ...form, child: '1.234' })).toEqual({ error: 'amount' });
    expect(buildPriceRule('t1', { ...form, group: 'x' })).toEqual({ error: 'amount' });
    expect(buildPriceRule('t1', { ...form, unit: 'PER_GROUP' })).toEqual({
      error: 'groupRequired',
    });
    expect(buildPriceRule('t1', { ...form, minPeople: 5, maxPeople: 2 })).toEqual({
      error: 'peopleRange',
    });
    expect(
      buildPriceRule('t1', { ...form, validFrom: '2026-12-02', validTo: '2026-12-01' }),
    ).toEqual({ error: 'dateRange' });
  });
});
