import type { AgeGroup, Difficulty } from '../../core/game-engine/types';
import type { Rng } from '../../shared/utils/random';

const SIZES: Record<'easy' | 'medium' | 'hard', [number, number][]> = {
  easy: [[2, 2], [3, 3], [3, 3]], // 4–9 pieces
  medium: [[3, 4], [4, 4], [4, 5]], // 12–20 pieces
  hard: [[5, 5], [5, 6], [6, 6]], // 25–36 pieces
};
const AGE_INDEX: Record<AgeGroup, number> = { '4-6': 0, '7-9': 1, '10-12': 2 };

export function gridSize(difficulty: Difficulty, age: AgeGroup): { rows: number; cols: number } {
  const d = difficulty === 'expert' ? 'hard' : difficulty;
  const [rows, cols] = SIZES[d][AGE_INDEX[age]];
  return { rows, cols };
}

export interface Piece {
  id: number;
  row: number;
  col: number;
  placed: boolean;
  /** Current position of the piece's top-left corner, normalized to board size (may be outside 0..1). */
  x: number;
  y: number;
  z: number;
}

/**
 * Piece outline strategy. Rectangular grid pieces today; irregular jigsaw tabs can be added
 * later by implementing another shape (e.g. SVG path clip) without touching the engine.
 */
export interface PieceShape {
  id: string;
  /** CSS clip-path for the piece element, or 'none'. */
  clipPath(piece: Piece, rows: number, cols: number): string;
  /** Extra margin (fraction of a cell) a piece needs for tabs. */
  overhang: number;
}

export const rectShape: PieceShape = { id: 'rect', clipPath: () => 'none', overhang: 0 };

export class PuzzleEngine {
  pieces: Piece[];
  misdrops = 0;
  private zTop = 1;

  constructor(
    readonly rows: number,
    readonly cols: number,
    readonly snapTolerance = 0.45, // fraction of a cell
  ) {
    if (rows < 1 || cols < 1) throw new Error('invalid grid');
    this.pieces = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.pieces.push({ id: r * cols + c, row: r, col: c, placed: false, x: 0, y: 0, z: 0 });
  }

  get total(): number {
    return this.pieces.length;
  }
  get placedCount(): number {
    return this.pieces.filter((p) => p.placed).length;
  }
  get isComplete(): boolean {
    return this.pieces.every((p) => p.placed);
  }

  /** Target top-left of a piece in normalized board coordinates. */
  target(p: Piece): { x: number; y: number } {
    return { x: p.col / this.cols, y: p.row / this.rows };
  }

  /** Scatter unplaced pieces inside a tray rectangle (normalized to board size). */
  scatter(rng: Rng, tray: { x: number; y: number; w: number; h: number }): void {
    const cw = 1 / this.cols;
    const ch = 1 / this.rows;
    for (const p of this.pieces) {
      if (p.placed) continue;
      p.x = tray.x + rng() * Math.max(0, tray.w - cw);
      p.y = tray.y + rng() * Math.max(0, tray.h - ch);
      p.z = this.zTop++;
    }
  }

  bringToFront(id: number): void {
    const p = this.pieces[id];
    if (p && !p.placed) p.z = this.zTop++;
  }

  move(id: number, x: number, y: number): void {
    const p = this.pieces[id];
    if (!p || p.placed) return;
    p.x = x;
    p.y = y;
  }

  /** Drop a piece; snaps and locks it if it is close enough to its correct slot. */
  drop(id: number, x: number, y: number): boolean {
    const p = this.pieces[id];
    if (!p || p.placed) return false;
    p.x = x;
    p.y = y;
    const t = this.target(p);
    const dx = (x - t.x) * this.cols;
    const dy = (y - t.y) * this.rows;
    if (Math.hypot(dx, dy) <= this.snapTolerance) {
      p.placed = true;
      p.x = t.x;
      p.y = t.y;
      p.z = 0;
      return true;
    }
    // Count as a mis-drop only when released over the board (not when tidying the tray).
    if (x > -0.5 / this.cols && x < 1 && y > -0.5 / this.rows && y < 1) this.misdrops++;
    return false;
  }

  /** Auto-place one piece (used by the hint system for the youngest players). */
  placeOne(id?: number): Piece | null {
    const p = id !== undefined ? this.pieces[id] : this.pieces.find((q) => !q.placed);
    if (!p || p.placed) return null;
    const t = this.target(p);
    p.placed = true;
    p.x = t.x;
    p.y = t.y;
    p.z = 0;
    return p;
  }
}

export function puzzleStars(hints: number, misdrops: number, pieces: number): number {
  let s = 3;
  if (hints >= 1) s--;
  if (hints >= 3) s--;
  if (misdrops > pieces) s--;
  return Math.max(1, s);
}
