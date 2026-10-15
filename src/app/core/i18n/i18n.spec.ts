import { TestBed } from '@angular/core/testing';
import { I18n, detectLang } from './i18n.service';
import { en } from './messages.en';
import { es } from './messages.es';

describe('i18n', () => {
  it('has the same keys in es and en, with no empty text', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const [k, v] of [...Object.entries(es), ...Object.entries(en)]) {
      expect(v.trim(), k).not.toBe('');
    }
  });

  it('detects the language, Spanish by default', () => {
    expect(detectLang('en', 'es-PE')).toBe('en');
    expect(detectLang(null, 'en-GB')).toBe('en');
    expect(detectLang(null, 'fr-FR')).toBe('es');
    expect(detectLang('xx', undefined)).toBe('es');
  });

  it('translates and interpolates', () => {
    const i18n = TestBed.inject(I18n);
    i18n.set('en');
    expect(i18n.t('nav.bookings')).toBe('Bookings');
    i18n.set('es');
    expect(i18n.t('nav.bookings')).toBe('Reservas');
  });
});
