import type { Difficulty } from '../../core/game-engine/types';
import { shuffle, type Rng } from '../../shared/utils/random';

export const CARD_COUNTS: Record<Difficulty, number> = { easy: 6, medium: 12, hard: 20, expert: 30 };

export interface CardFace {
  id: string;
  emoji?: string;
  image?: string;
  label?: Record<string, string>;
}

export interface MemoryCard {
  uid: number;
  faceId: string;
  faceUp: boolean;
  matched: boolean;
}

export type FlipOutcome =
  | { kind: 'ignored' }
  | { kind: 'first'; index: number }
  | { kind: 'match'; a: number; b: number; player: number }
  | { kind: 'mismatch'; a: number; b: number; player: number };

/** Pure, UI-independent memory matching rules (solo or turn-based multiplayer). */
export class MemoryEngine {
  cards: MemoryCard[];
  selected: number[] = [];
  moves = 0;
  scores: number[];
  currentPlayer = 0;
  pendingMismatch: [number, number] | null = null;

  constructor(faceIds: string[], rng: Rng, players = 1) {
    if (faceIds.length < 1) throw new Error('Need at least one pair');
    const deck = faceIds.flatMap((id) => [id, id]);
    this.cards = shuffle(rng, deck).map((faceId, uid) => ({ uid, faceId, faceUp: false, matched: false }));
    this.scores = Array(players).fill(0);
  }

  get pairs(): number {
    return this.cards.length / 2;
  }

  get matchedPairs(): number {
    return this.cards.filter((c) => c.matched).length / 2;
  }

  get isComplete(): boolean {
    return this.cards.every((c) => c.matched);
  }

  flip(index: number): FlipOutcome {
    const card = this.cards[index];
    if (!card || card.matched || card.faceUp || this.pendingMismatch || this.selected.length >= 2) return { kind: 'ignored' };
    card.faceUp = true;
    this.selected.push(index);
    if (this.selected.length === 1) return { kind: 'first', index };

    const [a, b] = this.selected;
    this.moves++;
    const player = this.currentPlayer;
    if (this.cards[a].faceId === this.cards[b].faceId) {
      this.cards[a].matched = this.cards[b].matched = true;
      this.scores[player]++;
      this.selected = [];
      return { kind: 'match', a, b, player };
    }
    this.pendingMismatch = [a, b];
    return { kind: 'mismatch', a, b, player };
  }

  /** Flip a mismatched pair back face down and pass the turn (in multiplayer). */
  resolveMismatch(): void {
    if (!this.pendingMismatch) return;
    for (const i of this.pendingMismatch) this.cards[i].faceUp = false;
    this.pendingMismatch = null;
    this.selected = [];
    this.currentPlayer = (this.currentPlayer + 1) % this.scores.length;
  }

  /** Indices of one unmatched pair that is not currently selected (for the hint system). */
  hintPair(): [number, number] | null {
    const groups = new Map<string, number[]>();
    this.cards.forEach((c, i) => {
      if (!c.matched && !c.faceUp) groups.set(c.faceId, [...(groups.get(c.faceId) ?? []), i]);
    });
    for (const idx of groups.values()) if (idx.length === 2) return [idx[0], idx[1]];
    return null;
  }

  /** -1 for a draw, otherwise index of the player with the highest score. */
  winner(): number {
    const max = Math.max(...this.scores);
    const leaders = this.scores.filter((s) => s === max).length;
    return leaders > 1 ? -1 : this.scores.indexOf(max);
  }
}

/** 3 stars for near-perfect memory, fewer for many extra moves; hints cost half a star each. */
export function memoryStars(moves: number, pairs: number, hintsUsed: number): number {
  const ratio = moves / pairs;
  let stars = ratio <= 1.6 ? 3 : ratio <= 2.3 ? 2 : 1;
  stars -= Math.floor(hintsUsed / 2);
  return Math.max(1, stars);
}

export function memoryScore(moves: number, pairs: number, seconds: number): number {
  return Math.max(10, Math.round(pairs * 100 - (moves - pairs) * 15 - seconds));
}

/** Choose a grid shape that keeps cards large on the current screen aspect ratio. */
export function gridFor(count: number, aspect: number): { cols: number; rows: number } {
  let best = { cols: count, rows: 1, score: -Infinity };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cell = Math.min(aspect / cols, 1 / rows); // relative size of a square cell
    const waste = cols * rows - count;
    const score = cell - waste * 0.002;
    if (score > best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}
