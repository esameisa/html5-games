import { beforeEach, describe, expect, it } from 'vitest';
import { floodFill, hexToRgba, History } from '../../src/games/color-splash/fill';
import { validateTemplate, type Artwork } from '../../src/games/color-splash/content';
import pack from '../../src/games/color-splash/templates.json';
import { db } from '../../src/core/storage/db';
import { profiles, records } from '../../src/core/storage/repositories';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function makeOutline(w: number, h: number, wallX: number) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) a[(y * w + wallX) * 4 + 3] = 255; // vertical line
  return a;
}

describe('color splash flood fill', () => {
  it('fills a region bounded by template lines only', () => {
    const w = 10;
    const h = 5;
    const paint = new Uint8ClampedArray(w * h * 4);
    const outline = makeOutline(w, h, 4);
    const changed = floodFill(paint, outline, w, h, 1, 1, [255, 0, 0, 255]);
    expect(changed).toBe(4 * h);
    expect(paint[(2 * w + 3) * 4]).toBe(255); // left side filled
    expect(paint[(2 * w + 6) * 4 + 3]).toBe(0); // right side untouched
  });

  it('does nothing when tapping on a line or with the same colour', () => {
    const w = 6;
    const paint = new Uint8ClampedArray(w * w * 4);
    const outline = makeOutline(w, w, 2);
    expect(floodFill(paint, outline, w, w, 2, 2, [0, 0, 255, 255])).toBe(0);
    floodFill(paint, outline, w, w, 0, 0, [0, 0, 255, 255]);
    expect(floodFill(paint, outline, w, w, 0, 0, [0, 0, 255, 255])).toBe(0);
  });

  it('recolours an already-filled region and respects brush strokes as boundaries', () => {
    const w = 8;
    const paint = new Uint8ClampedArray(w * w * 4);
    floodFill(paint, null, w, w, 0, 0, [0, 255, 0, 255]);
    // paint a brush stroke column in a different colour
    for (let y = 0; y < w; y++) paint.set([0, 0, 0, 255], (y * w + 3) * 4);
    const changed = floodFill(paint, null, w, w, 0, 0, [255, 255, 0, 255]);
    expect(changed).toBe(3 * w);
    expect(paint[(0 * w + 5) * 4 + 1]).toBe(255); // right side still green
    expect(paint[(0 * w + 5) * 4]).toBe(0);
  });

  it('parses colours and keeps a bounded undo/redo history', () => {
    expect(hexToRgba('#ff8000')).toEqual([255, 128, 0, 255]);
    const hist = new History<number>(3);
    [1, 2, 3, 4].forEach((n) => hist.push(n));
    expect(hist.undo(5)).toBe(4);
    expect(hist.undo(4)).toBe(3);
    expect(hist.redo(3)).toBe(4);
    expect(hist.undo(4)).toBe(3);
    expect(hist.undo(3)).toBe(2);
    expect(hist.undo(2)).toBeNull(); // oldest snapshot (1) dropped by the limit
    hist.push(9);
    expect(hist.canRedo).toBe(false);
  });

  it('bundles at least 15 valid templates across the required themes', () => {
    expect(pack.levels.length).toBeGreaterThanOrEqual(15);
    const themes = new Set(pack.levels.map((l) => l.theme));
    for (const t of ['animals', 'dinosaurs', 'flowers', 'cars', 'robots', 'houses', 'space']) expect(themes.has(t)).toBe(true);
    for (const l of pack.levels) {
      expect(validateTemplate(l as unknown as Record<string, unknown>, 0)).toEqual([]);
      expect(existsSync(resolve(__dirname, '../../public', l.image))).toBe(true);
    }
  });
});

describe('artwork save and reload', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.profiles.clear();
  });

  it('saves artwork per profile, reloads it and deletes it', async () => {
    const a = await profiles.create({ nickname: 'A', avatar: { character: 'cat', color: '#fff', hat: 'none', accessory: 'none' }, ageGroup: '4-6', locale: 'en' });
    const b = await profiles.create({ nickname: 'B', avatar: { character: 'cat', color: '#fff', hat: 'none', accessory: 'none' }, ageGroup: '4-6', locale: 'en' });
    const art: Artwork = { id: 'art1', templateId: 'cat', createdAt: 'x', updatedAt: 'x', width: 800, height: 800, paint: 'data:image/png;base64,AAAA', preview: 'data:image/png;base64,BBBB' };
    await records.put(a.id, 'color-splash', 'artworks', art);
    await records.put(a.id, 'color-splash', 'artworks', { ...art, paint: 'data:image/png;base64,CCCC', updatedAt: 'y' }); // re-save
    const listA = await records.list<Artwork>(a.id, 'color-splash', 'artworks');
    expect(listA).toHaveLength(1);
    expect(listA[0].paint).toBe('data:image/png;base64,CCCC');
    expect(await records.list(b.id, 'color-splash', 'artworks')).toHaveLength(0); // isolated
    await records.remove(a.id, 'color-splash', 'artworks', 'art1');
    expect(await records.count(a.id, 'color-splash', 'artworks')).toBe(0);
  });
});
