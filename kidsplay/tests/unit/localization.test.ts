import { describe, expect, it } from 'vitest';
import { en } from '../../src/core/localization/en';
import { ar } from '../../src/core/localization/ar';
import { dirFor, i18n, registerGameStrings, setLocale } from '../../src/core/localization/i18n';
import { memoryStrings } from '../../src/games/memory-cards/i18n';
import { puzzleStrings } from '../../src/games/puzzle-world/i18n';
import { colorStrings } from '../../src/games/color-splash/i18n';
import { mazeStrings } from '../../src/games/maze-escape/i18n';
import { mathStrings } from '../../src/games/math-battle/i18n';
import { chefStrings } from '../../src/games/mini-chef/i18n';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('localization', () => {
  it('Arabic and English core strings have identical keys', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it.each([
    ['memory', memoryStrings],
    ['puzzle', puzzleStrings],
    ['color', colorStrings],
    ['maze', mazeStrings],
    ['math', mathStrings],
    ['chef', chefStrings],
  ])('%s game strings exist in both languages', (_n, s) => {
    expect(keys(s.ar).sort()).toEqual(keys(s.en).sort());
    for (const v of keys(s.ar).map((k) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], s.ar))) {
      expect(typeof v === 'string' && v.length > 0).toBe(true);
    }
  });

  it('switches direction for Arabic (RTL) and English (LTR)', async () => {
    await setLocale('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(i18n.t('common.play')).toBe('العب');
    await setLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(i18n.t('common.play')).toBe('Play');
    expect(dirFor('ar')).toBe('rtl');
  });

  it('resolves game namespaces with interpolation', async () => {
    registerGameStrings('memory-cards', memoryStrings);
    registerGameStrings('mini-chef', chefStrings);
    await setLocale('ar');
    expect(i18n.t('mini-chef:order', { dish: 'بيتزا' })).toContain('بيتزا');
    await setLocale('en');
    expect(i18n.t('memory-cards:chooseTheme')).toBe('Choose a card theme');
  });
});
