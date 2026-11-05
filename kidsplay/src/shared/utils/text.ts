import type { Locale } from '../../core/game-engine/types';

/** Pick a localized string from `{ en, ar }` style objects with English fallback. */
export function loc(text: Record<string, string> | string | undefined, locale: Locale | string): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[locale] ?? text.en ?? Object.values(text)[0] ?? '';
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
