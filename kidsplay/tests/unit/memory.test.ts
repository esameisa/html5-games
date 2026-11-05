import { describe, expect, it } from 'vitest';
import { CARD_COUNTS, MemoryEngine, gridFor, memoryStars } from '../../src/games/memory-cards/engine';
import { validateCardSet } from '../../src/games/memory-cards/content';
import pack from '../../src/games/memory-cards/cards.json';
import { createRng } from '../../src/shared/utils/random';

const solveAll = (e: MemoryEngine) => {
  const seen = new Map<string, number[]>();
  e.cards.forEach((c, i) => seen.set(c.faceId, [...(seen.get(c.faceId) ?? []), i]));
  for (const [a, b] of seen.values()) {
    e.flip(a);
    e.flip(b);
  }
};

describe('memory cards', () => {
  it('uses the required card counts', () => {
    expect(CARD_COUNTS).toEqual({ easy: 6, medium: 12, hard: 20, expert: 30 });
  });

  it('deals pairs and completes when all pairs are matched', () => {
    const e = new MemoryEngine(['a', 'b', 'c'], createRng(1));
    expect(e.cards).toHaveLength(6);
    expect(e.isComplete).toBe(false);
    solveAll(e);
    expect(e.isComplete).toBe(true);
    expect(e.moves).toBe(3);
    expect(e.matchedPairs).toBe(3);
  });

  it('flips back non-matching cards and ignores invalid taps', () => {
    const e = new MemoryEngine(['a', 'b'], createRng(2));
    const a = e.cards.findIndex((c) => c.faceId === 'a');
    const b = e.cards.findIndex((c) => c.faceId === 'b');
    expect(e.flip(a).kind).toBe('first');
    expect(e.flip(a).kind).toBe('ignored'); // same card
    expect(e.flip(b).kind).toBe('mismatch');
    const other = e.cards.findIndex((_c, i) => i !== a && i !== b);
    expect(e.flip(other).kind).toBe('ignored'); // locked until resolved
    e.resolveMismatch();
    expect(e.cards[a].faceUp).toBe(false);
    expect(e.cards[b].faceUp).toBe(false);
  });

  it('runs turn-based two-player scoring', () => {
    const e = new MemoryEngine(['a', 'b'], createRng(3), 2);
    const ai = e.cards.map((c, i) => (c.faceId === 'a' ? i : -1)).filter((i) => i >= 0);
    const bi = e.cards.map((c, i) => (c.faceId === 'b' ? i : -1)).filter((i) => i >= 0);
    e.flip(ai[0]);
    e.flip(bi[0]); // player 0 misses
    e.resolveMismatch();
    expect(e.currentPlayer).toBe(1);
    e.flip(ai[0]);
    expect(e.flip(ai[1])).toMatchObject({ kind: 'match', player: 1 });
    expect(e.currentPlayer).toBe(1); // match keeps the turn
    e.flip(bi[0]);
    e.flip(bi[1]);
    expect(e.scores).toEqual([0, 2]);
    expect(e.winner()).toBe(1);
  });

  it('declares a draw on equal scores', () => {
    const e = new MemoryEngine(['a'], createRng(1), 2);
    e.scores = [2, 2];
    expect(e.winner()).toBe(-1);
  });

  it('hint returns an unmatched pair', () => {
    const e = new MemoryEngine(['a', 'b'], createRng(4));
    const [x, y] = e.hintPair()!;
    expect(e.cards[x].faceId).toBe(e.cards[y].faceId);
  });

  it('awards stars by efficiency', () => {
    expect(memoryStars(6, 6, 0)).toBe(3);
    expect(memoryStars(13, 6, 0)).toBe(2);
    expect(memoryStars(30, 6, 0)).toBe(1);
    expect(memoryStars(6, 6, 2)).toBe(2);
  });

  it('chooses a sensible grid', () => {
    const g = gridFor(12, 16 / 9);
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(12);
    expect(g.cols).toBeGreaterThan(g.rows);
    const p = gridFor(12, 9 / 16);
    expect(p.rows).toBeGreaterThan(p.cols);
  });

  it('bundled card sets are valid data and support expert mode', () => {
    for (const set of pack.levels) {
      expect(validateCardSet(set as unknown as Record<string, unknown>, 0)).toEqual([]);
      expect(set.cards.length).toBeGreaterThanOrEqual(CARD_COUNTS.expert / 2);
    }
    expect(pack.levels.map((l) => l.id)).toEqual(['animals', 'fruits', 'vehicles', 'space', 'shapes', 'ocean']);
  });
});
