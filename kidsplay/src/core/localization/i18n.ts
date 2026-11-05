import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ar } from './ar';
import type { Locale } from '../game-engine/types';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ar'];
export const RTL_LOCALES = new Set<Locale>(['ar']);

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

/** Switch language and update document direction (RTL for Arabic). */
export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }
}

/**
 * Games ship their own strings and register them under their own namespace so that each
 * game stays self-contained. Keys are then used as `t('memory-cards:key')`.
 */
export function registerGameStrings(gameId: string, bundles: Record<Locale, Record<string, unknown>>): void {
  for (const [lng, res] of Object.entries(bundles)) {
    if (!i18n.hasResourceBundle(lng, gameId)) i18n.addResourceBundle(lng, gameId, res, true, true);
  }
}

/** A translator bound to a game namespace, with fallback to the shared translation namespace. */
export function gameTranslator(gameId: string) {
  return (key: string, options?: Record<string, unknown>): string =>
    i18n.t(key, { ns: [gameId, 'translation'], ...options }) as string;
}
