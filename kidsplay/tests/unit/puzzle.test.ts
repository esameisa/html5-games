import { describe, expect, it } from 'vitest';
import { PuzzleEngine, gridSize, puzzleStars, rectShape } from '../../src/games/puzzle-world/engine';
import { validatePuzzle } from '../../src/games/puzzle-world/content';
import pack from '../../src/games/puzzle-world/puzzles.json';
import { createRng } from '../../src/shared/utils/random';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('puzzle world', () => {
  it('piece counts match the difficulty ranges', () => {
    for (const age of ['4-6', '7-9', '10-12'] as const) {
      const e = gridSize('easy', age);
      const m = gridSize('medium', age);
      const h = gridSize('hard', age);
      expect(e.rows * e.cols).toBeGreaterThanOrEqual(4);
      expect(e.rows * e.cols).toBeLessThanOrEqual(9);
      expect(m.rows * m.cols).toBeGreaterThanOrEqual(12);
      expect(m.rows * m.cols).toBeLessThanOrEqual(20);
      expect(h.rows * h.cols).toBeGreaterThanOrEqual(25);
      expect(h.rows * h.cols).toBeLessThanOrEqual(36);
    }
  });

  it('snaps pieces dropped near their slot and completes the puzzle', () => {
    const p = new PuzzleEngine(3, 3);
    p.scatter(createRng(1), { x: 1.1, y: 0, w: 0.8, h: 1 });
    expect(p.pieces.every((x) => x.x >= 1.1)).toBe(true);
    for (const piece of p.pieces) {
      const t = p.target(piece);
      expect(p.drop(piece.id, t.x + 0.05, t.y - 0.04)).toBe(true);
    }
    expect(p.isComplete).toBe(true);
    expect(p.misdrops).toBe(0);
  });

  it('does not snap far drops and counts board mis-drops', () => {
    const p = new PuzzleEngine(2, 2);
    expect(p.drop(0, 0.5, 0.5)).toBe(false); // piece 0 belongs at (0,0)
    expect(p.pieces[0].placed).toBe(false);
    expect(p.misdrops).toBe(1);
    expect(p.drop(0, 1.5, 0.2)).toBe(false); // tray: not a mis-drop
    expect(p.misdrops).toBe(1);
    p.drop(0, 0, 0);
    expect(p.drop(0, 0.5, 0.5)).toBe(false); // placed pieces are locked
    expect(p.pieces[0].x).toBe(0);
  });

  it('hint can auto-place a piece', () => {
    const p = new PuzzleEngine(2, 2);
    const placed = p.placeOne();
    expect(placed?.placed).toBe(true);
    expect(p.placedCount).toBe(1);
  });

  it('rectangular shape strategy is pluggable', () => {
    expect(rectShape.clipPath(new PuzzleEngine(1, 1).pieces[0], 1, 1)).toBe('none');
  });

  it('stars reflect hints and mistakes', () => {
    expect(puzzleStars(0, 0, 9)).toBe(3);
    expect(puzzleStars(1, 0, 9)).toBe(2);
    expect(puzzleStars(3, 20, 9)).toBe(1);
  });

  it('bundled puzzles cover all six themes and their images exist', () => {
    const themes = new Set(pack.levels.map((l) => l.theme));
    expect([...themes].sort()).toEqual(['animals', 'cars', 'castles', 'dinosaurs', 'nature', 'space']);
    for (const l of pack.levels) {
      expect(validatePuzzle(l as unknown as Record<string, unknown>, 0)).toEqual([]);
      expect(existsSync(resolve(__dirname, '../../public', l.image))).toBe(true);
    }
  });
});
