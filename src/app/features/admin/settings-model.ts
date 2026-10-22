import type { components } from '../../core/api/schema';
import type { MessageKey } from '../../core/i18n/messages.es';
import { centsToInput, parseToCents } from '../../core/format/money';

export type Settings = components['schemas']['Settings'];
export type SettingsInput = components['schemas']['SettingsInput'];

export type SettingKey =
  'depositPercent' | 'holdMinutes' | 'operatorRefundLimitCents' | 'complaintDueDays';

/** `unit` decides how the value is shown and parsed: money is typed in units but stored in cents. */
export interface SettingField {
  key: SettingKey;
  unit: 'percent' | 'minutes' | 'money' | 'days';
  min: number;
  max?: number;
  label: MessageKey;
  hint: MessageKey;
}

/** The known keys of the contract's `Settings`, with the same ranges the API validates. */
export const SETTING_FIELDS: readonly SettingField[] = [
  {
    key: 'depositPercent',
    unit: 'percent',
    min: 0,
    max: 100,
    label: 'settings.depositPercent',
    hint: 'settings.depositPercent.hint',
  },
  {
    key: 'holdMinutes',
    unit: 'minutes',
    min: 1,
    max: 120,
    label: 'settings.holdMinutes',
    hint: 'settings.holdMinutes.hint',
  },
  {
    key: 'operatorRefundLimitCents',
    unit: 'money',
    min: 0,
    label: 'settings.operatorRefundLimit',
    hint: 'settings.operatorRefundLimit.hint',
  },
  {
    key: 'complaintDueDays',
    unit: 'days',
    min: 1,
    max: 60,
    label: 'settings.complaintDueDays',
    hint: 'settings.complaintDueDays.hint',
  },
];

export type SettingsForm = Record<SettingKey, string>;
export type SettingsError = 'invalidNumber' | 'outOfRange';

/** API values to the text shown in each input. */
export function toForm(s: Partial<Settings>): SettingsForm {
  const text = (f: SettingField) => {
    const v = s[f.key];
    if (typeof v !== 'number') return '';
    return f.unit === 'money' ? centsToInput(v) : String(v);
  };
  return Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, text(f)])) as SettingsForm;
}

/**
 * Only the keys whose text differs from what was loaded are sent (`PUT /settings` changes just those),
 * or the first field with a problem.
 */
export function toInput(
  form: SettingsForm,
  loaded: SettingsForm,
): { value: SettingsInput } | { error: SettingsError; key: SettingKey } {
  const value: SettingsInput = {};
  for (const f of SETTING_FIELDS) {
    const raw = form[f.key].trim();
    if (raw === loaded[f.key].trim()) continue;
    const n = f.unit === 'money' ? parseToCents(raw) : /^\d+$/.test(raw) ? Number(raw) : null;
    if (n === null) return { error: 'invalidNumber', key: f.key };
    const lo = f.unit === 'money' ? f.min * 100 : f.min;
    if (n < lo || (f.max !== undefined && n > f.max)) return { error: 'outOfRange', key: f.key };
    value[f.key] = n;
  }
  return { value };
}
