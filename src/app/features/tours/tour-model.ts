import type {
  Currency,
  PriceRule,
  PriceRuleInput,
  PriceUnit,
  TourFormat,
  TourOffer,
  TourRef,
  UpdateTourRef,
} from '../../core/api/types';
import { centsToInput, parseToCents } from '../../core/format/money';

/** "es, EN pt" -> ['es', 'en', 'pt']; `null` when a code is not two letters or there are more than 10. */
export function parseLanguages(text: string): string[] | null {
  const codes = [
    ...new Set(
      text
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean),
    ),
  ];
  return codes.length <= 10 && codes.every((c) => /^[a-z]{2}$/.test(c)) ? codes : null;
}

export interface TourForm {
  active: boolean;
  requiresWaiver: boolean;
  durationHours: number | null;
  format: TourOffer | '';
  languages: string;
  meetingPointEs: string;
  meetingPointEn: string;
  meetingPointUrl: string;
  latitude: number | null;
  longitude: number | null;
  minAge: number | null;
  minHeightCm: number | null;
  defaultCapacity: number | null;
  cancellationPolicyId: string;
}

export function tourToForm(t: TourRef): TourForm {
  return {
    active: t.active,
    requiresWaiver: t.requiresWaiver,
    durationHours: t.durationHours ?? null,
    format: t.format ?? '',
    languages: (t.languages ?? []).join(', '),
    meetingPointEs: t.meetingPoint?.es ?? '',
    meetingPointEn: t.meetingPoint?.en ?? '',
    meetingPointUrl: t.meetingPointUrl ?? '',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    minAge: t.minAge ?? null,
    minHeightCm: t.minHeightCm ?? null,
    defaultCapacity: t.defaultCapacity ?? null,
    cancellationPolicyId: t.cancellationPolicyId ?? '',
  };
}

/** The whole form goes in the PATCH; an empty input is sent as `null` so the API clears it. */
export function buildUpdateTourRef(v: TourForm): UpdateTourRef {
  const es = v.meetingPointEs.trim();
  const en = v.meetingPointEn.trim();
  return {
    active: v.active,
    requiresWaiver: v.requiresWaiver,
    durationHours: v.durationHours,
    format: v.format || null,
    languages: parseLanguages(v.languages) ?? [],
    meetingPoint: es || en ? { ...(es ? { es } : {}), ...(en ? { en } : {}) } : null,
    meetingPointUrl: v.meetingPointUrl.trim() || null,
    latitude: v.latitude,
    longitude: v.longitude,
    minAge: v.minAge,
    minHeightCm: v.minHeightCm,
    defaultCapacity: v.defaultCapacity,
    cancellationPolicyId: v.cancellationPolicyId || null,
  };
}

/** Amounts are typed in currency units ("120.50") and sent in cents. */
export interface PriceForm {
  currency: Currency;
  format: TourFormat;
  unit: PriceUnit;
  adult: string;
  child: string;
  group: string;
  minPeople: number | null;
  maxPeople: number | null;
  validFrom: string;
  validTo: string;
  priority: number | null;
  active: boolean;
}

export const EMPTY_PRICE: PriceForm = {
  currency: 'USD',
  format: 'SHARED',
  unit: 'PER_PERSON',
  adult: '',
  child: '',
  group: '',
  minPeople: null,
  maxPeople: null,
  validFrom: '',
  validTo: '',
  priority: 0,
  active: true,
};

export function priceToForm(r: PriceRule): PriceForm {
  return {
    currency: r.currency,
    format: r.format ?? 'SHARED',
    unit: r.unit ?? 'PER_PERSON',
    adult: centsToInput(r.adultCents),
    child: r.childCents == null ? '' : centsToInput(r.childCents),
    group: r.groupCents == null ? '' : centsToInput(r.groupCents),
    minPeople: r.minPeople ?? null,
    maxPeople: r.maxPeople ?? null,
    validFrom: r.validFrom ?? '',
    validTo: r.validTo ?? '',
    priority: r.priority,
    active: r.active,
  };
}

export type PriceError = 'amount' | 'groupRequired' | 'peopleRange' | 'dateRange';

/** The full rule (`PUT` replaces it), or the first problem; the checks mirror the API's. */
export function buildPriceRule(
  tourRefId: string,
  v: PriceForm,
): { value: PriceRuleInput } | { error: PriceError } {
  const optional = (text: string) => (text.trim() ? parseToCents(text) : null);
  const adultCents = parseToCents(v.adult);
  const childCents = optional(v.child);
  const groupCents = optional(v.group);
  if (adultCents === null || (v.child.trim() && childCents === null)) return { error: 'amount' };
  if (v.group.trim() && groupCents === null) return { error: 'amount' };
  if (v.unit === 'PER_GROUP' && groupCents === null) return { error: 'groupRequired' };
  if (v.minPeople != null && v.maxPeople != null && v.minPeople > v.maxPeople)
    return { error: 'peopleRange' };
  if (v.validFrom && v.validTo && v.validFrom > v.validTo) return { error: 'dateRange' };
  return {
    value: {
      tourRefId,
      currency: v.currency,
      format: v.format,
      unit: v.unit,
      adultCents,
      childCents,
      groupCents,
      minPeople: v.minPeople,
      maxPeople: v.maxPeople,
      validFrom: v.validFrom || null,
      validTo: v.validTo || null,
      priority: v.priority ?? 0,
      active: v.active,
    },
  };
}
