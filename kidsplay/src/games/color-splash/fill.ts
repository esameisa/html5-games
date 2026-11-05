/**
 * Scanline flood fill used by tap-to-fill coloring.
 *
 * `paint` is the child's paint layer (RGBA). `outline` is the template line layer: pixels
 * whose alpha exceeds `lineAlpha` are walls. The fill spreads through 4-connected pixels whose
 * paint color is within `tolerance` of the color under the seed point.
 * Returns the number of pixels changed (0 when tapping a line or same color).
 */
export function floodFill(
  paint: Uint8ClampedArray,
  outline: Uint8ClampedArray | null,
  width: number,
  height: number,
  sx: number,
  sy: number,
  color: [number, number, number, number],
  tolerance = 48,
  lineAlpha = 110,
): number {
  sx = Math.floor(sx);
  sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return 0;
  const isWall = (i: number) => outline !== null && outline[i * 4 + 3] > lineAlpha;
  const seed = sy * width + sx;
  if (isWall(seed)) return 0;
  const o = seed * 4;
  const target = [paint[o], paint[o + 1], paint[o + 2], paint[o + 3]];
  if (target[0] === color[0] && target[1] === color[1] && target[2] === color[2] && target[3] === color[3]) return 0;

  const matches = (i: number) => {
    if (isWall(i)) return false;
    const p = i * 4;
    // Transparent pixels match each other regardless of RGB.
    if (target[3] === 0) return paint[p + 3] <= tolerance;
    return (
      Math.abs(paint[p] - target[0]) + Math.abs(paint[p + 1] - target[1]) + Math.abs(paint[p + 2] - target[2]) + Math.abs(paint[p + 3] - target[3]) <=
      tolerance * 2
    );
  };
  const visited = new Uint8Array(width * height);
  const set = (i: number) => {
    const p = i * 4;
    paint[p] = color[0];
    paint[p + 1] = color[1];
    paint[p + 2] = color[2];
    paint[p + 3] = color[3];
    visited[i] = 1;
  };

  let changed = 0;
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    let i = y * width + x;
    while (x >= 0 && !visited[i] && matches(i)) {
      x--;
      i--;
    }
    x++;
    i++;
    let up = false;
    let down = false;
    while (x < width && !visited[i] && matches(i)) {
      set(i);
      changed++;
      if (y > 0) {
        const u = i - width;
        if (!visited[u] && matches(u)) {
          if (!up) {
            stack.push(x, y - 1);
            up = true;
          }
        } else up = false;
      }
      if (y < height - 1) {
        const d = i + width;
        if (!visited[d] && matches(d)) {
          if (!down) {
            stack.push(x, y + 1);
            down = true;
          }
        } else down = false;
      }
      x++;
      i++;
    }
  }
  // Grow the fill by one pixel under anti-aliased line edges so no white halo remains.
  if (outline && changed > 0) {
    const grow: number[] = [];
    for (let i = 0; i < width * height; i++) {
      if (visited[i]) continue;
      const a = outline[i * 4 + 3];
      if (a === 0 || a > 254) continue;
      const x = i % width;
      if ((x > 0 && visited[i - 1]) || (x < width - 1 && visited[i + 1]) || (i >= width && visited[i - width]) || (i < width * (height - 1) && visited[i + width])) grow.push(i);
    }
    for (const i of grow) {
      const p = i * 4;
      paint[p] = color[0];
      paint[p + 1] = color[1];
      paint[p + 2] = color[2];
      paint[p + 3] = color[3];
    }
  }
  return changed;
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** Bounded undo/redo history of snapshots. */
export class History<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  constructor(private limit = 12) {}
  push(state: T): void {
    this.undoStack.push(state);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(current: T): T | null {
    const prev = this.undoStack.pop();
    if (prev === undefined) return null;
    this.redoStack.push(current);
    return prev;
  }
  redo(current: T): T | null {
    const next = this.redoStack.pop();
    if (next === undefined) return null;
    this.undoStack.push(current);
    return next;
  }
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
