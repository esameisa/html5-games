import { createRng, shuffle, type Rng } from '../../shared/utils/random';

/**
 * Maze grid format (rows of characters):
 *   '#' wall   '.' floor   'S' start   'E' exit   '*' star
 *   'a' 'b' 'c' keys       'A' 'B' 'C' matching doors
 */
export type Grid = string[];
export interface Pos {
  x: number;
  y: number;
}

export const KEY_CHARS = ['a', 'b', 'c'];
export const DOOR_CHARS = ['A', 'B', 'C'];
const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function findAll(grid: Grid, ch: string): Pos[] {
  const out: Pos[] = [];
  grid.forEach((row, y) => [...row].forEach((c, x) => c === ch && out.push({ x, y })));
  return out;
}

export function cellAt(grid: Grid, x: number, y: number): string {
  return grid[y]?.[x] ?? '#';
}

export interface GeneratorSpec {
  seed: number;
  w: number; // cells across
  h: number; // cells down
  keys: number; // 0..3
  stars: number;
  /** Extra openings (0..1) that create loops so the maze is less linear. */
  braid?: number;
}

/** Deterministic perfect-maze generator (recursive backtracker) + keys/doors/stars placement. */
export function generateMaze(spec: GeneratorSpec): Grid {
  for (let attempt = 0; attempt < 50; attempt++) {
    const g = tryGenerate({ ...spec, seed: spec.seed + attempt * 7919 });
    if (g && solveMaze(g).solvable) return g;
  }
  throw new Error(`Could not generate a solvable maze for seed ${spec.seed}`);
}

function tryGenerate(spec: GeneratorSpec): Grid | null {
  const rng = createRng(spec.seed);
  const W = spec.w * 2 + 1;
  const H = spec.h * 2 + 1;
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill('#'));
  const visited = new Set<string>();
  const stack: [number, number][] = [[0, 0]];
  visited.add('0,0');
  g[1][1] = '.';
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = shuffle(rng, DIRS).filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < spec.w && ny < spec.h && !visited.has(`${nx},${ny}`);
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = options[0];
    const nx = cx + dx;
    const ny = cy + dy;
    g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = '.';
    g[ny * 2 + 1][nx * 2 + 1] = '.';
    visited.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }
  // Braiding: knock out a few walls between cells to add loops (only when there are no doors).
  if (spec.braid && spec.keys === 0) {
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        if (g[y][x] !== '#') continue;
        const horiz = x % 2 === 0 && y % 2 === 1;
        const vert = x % 2 === 1 && y % 2 === 0;
        if ((horiz || vert) && rng() < spec.braid * 0.15) g[y][x] = '.';
      }
  }

  const start = { x: 1, y: 1 };
  const dist = bfs(g.map((r) => r.join('')), start, (c) => c !== '#');
  let exit = start;
  let best = -1;
  dist.forEach((d, k) => {
    const [x, y] = k.split(',').map(Number);
    if (x % 2 === 1 && y % 2 === 1 && d > best) {
      best = d;
      exit = { x, y };
    }
  });
  g[start.y][start.x] = 'S';
  g[exit.y][exit.x] = 'E';

  // Main path from S to E.
  const path = shortestPath(g.map((r) => r.join('')), start, exit, (c) => c !== '#');
  if (!path) return null;
  const used = new Set<string>([key(start), key(exit)]);
  const keys = Math.min(3, spec.keys);
  const doors: Pos[] = [];
  for (let i = 0; i < keys; i++) {
    const idx = Math.floor((path.length * (i + 1)) / (keys + 1));
    // Doors go on passage cells (between two maze cells) so they always block the corridor.
    let d = idx;
    while (d < path.length - 1 && (path[d].x % 2 === 1 && path[d].y % 2 === 1)) d++;
    const p = path[d];
    if (!p || used.has(key(p))) return null;
    g[p.y][p.x] = DOOR_CHARS[i];
    used.add(key(p));
    doors.push(p);
  }
  const onPath = new Set(path.map(key));
  for (let i = 0; i < keys; i++) {
    // Region reachable with doors < i open and doors >= i closed.
    const grid = g.map((r) => r.join(''));
    const region = bfs(grid, start, (c) => c !== '#' && !DOOR_CHARS.slice(i).includes(c));
    const candidates = [...region.entries()]
      .map(([k, d]) => ({ p: parse(k), d }))
      .filter(({ p }) => !used.has(key(p)) && grid[p.y][p.x] === '.' && p.x % 2 === 1 && p.y % 2 === 1);
    if (!candidates.length) return null;
    const offPath = candidates.filter(({ p }) => !onPath.has(key(p)));
    const pool = (offPath.length ? offPath : candidates).sort((a, b) => b.d - a.d);
    const choice = pool[Math.floor(rng() * Math.min(3, pool.length))].p;
    g[choice.y][choice.x] = KEY_CHARS[i];
    used.add(key(choice));
  }
  // Stars prefer dead ends, then any free cell.
  const grid = g.map((r) => r.join(''));
  const free: Pos[] = [];
  const deadEnds: Pos[] = [];
  for (let y = 1; y < H; y += 2)
    for (let x = 1; x < W; x += 2) {
      if (grid[y][x] !== '.') continue;
      const deg = DIRS.filter(([dx, dy]) => grid[y + dy][x + dx] !== '#').length;
      (deg === 1 ? deadEnds : free).push({ x, y });
    }
  const starSpots = [...shuffle(rng, deadEnds), ...shuffle(rng, free)].slice(0, spec.stars);
  for (const s of starSpots) g[s.y][s.x] = '*';
  void doors;
  return g.map((r) => r.join(''));
}

const key = (p: Pos) => `${p.x},${p.y}`;
const parse = (k: string): Pos => {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
};

function bfs(grid: Grid, start: Pos, passable: (c: string) => boolean): Map<string, number> {
  const dist = new Map<string, number>([[key(start), 0]]);
  const q: Pos[] = [start];
  while (q.length) {
    const p = q.shift()!;
    for (const [dx, dy] of DIRS) {
      const n = { x: p.x + dx, y: p.y + dy };
      const k = key(n);
      if (dist.has(k) || !passable(cellAt(grid, n.x, n.y))) continue;
      dist.set(k, dist.get(key(p))! + 1);
      q.push(n);
    }
  }
  return dist;
}

function shortestPath(grid: Grid, from: Pos, to: Pos, passable: (c: string) => boolean): Pos[] | null {
  const prev = new Map<string, string | null>([[key(from), null]]);
  const q: Pos[] = [from];
  while (q.length) {
    const p = q.shift()!;
    if (p.x === to.x && p.y === to.y) break;
    for (const [dx, dy] of DIRS) {
      const n = { x: p.x + dx, y: p.y + dy };
      const k = key(n);
      if (prev.has(k) || !passable(cellAt(grid, n.x, n.y))) continue;
      prev.set(k, key(p));
      q.push(n);
    }
  }
  if (!prev.has(key(to))) return null;
  const out: Pos[] = [];
  let cur: string | null = key(to);
  while (cur) {
    out.unshift(parse(cur));
    cur = prev.get(cur) ?? null;
  }
  return out;
}

export interface SolveResult {
  solvable: boolean;
  /** Fewest moves from start to exit (keys collected as needed). */
  pathLength: number;
  starsTotal: number;
  unreachableStars: number;
  errors: string[];
}

/**
 * Validates a maze by exploring the state space (position × keys held). Moves are reversible
 * and keys are never lost, so if every star and the exit are reachable, a route that collects
 * all stars and then exits always exists.
 */
export function solveMaze(grid: Grid): SolveResult {
  const errors: string[] = [];
  const width = grid[0]?.length ?? 0;
  if (!grid.length || grid.some((r) => r.length !== width)) errors.push('rows must have equal length');
  if (/[^#.SE*abcABC]/.test(grid.join(''))) errors.push('unknown characters');
  const starts = findAll(grid, 'S');
  const exits = findAll(grid, 'E');
  if (starts.length !== 1) errors.push('needs exactly one start');
  if (exits.length !== 1) errors.push('needs exactly one exit');
  const stars = findAll(grid, '*');
  if (errors.length) return { solvable: false, pathLength: -1, starsTotal: stars.length, unreachableStars: stars.length, errors };

  const start = starts[0];
  const seen = new Set<string>();
  const q: { p: Pos; mask: number; d: number }[] = [{ p: start, mask: 0, d: 0 }];
  seen.add(`${start.x},${start.y},0`);
  let pathLength = -1;
  const reached = new Set<string>();
  while (q.length) {
    const { p, mask, d } = q.shift()!;
    reached.add(key(p));
    const c = cellAt(grid, p.x, p.y);
    if (c === 'E' && pathLength < 0) pathLength = d;
    for (const [dx, dy] of DIRS) {
      const n = { x: p.x + dx, y: p.y + dy };
      const nc = cellAt(grid, n.x, n.y);
      if (nc === '#') continue;
      const di = DOOR_CHARS.indexOf(nc);
      if (di >= 0 && !(mask & (1 << di))) continue;
      const ki = KEY_CHARS.indexOf(nc);
      const nm = ki >= 0 ? mask | (1 << ki) : mask;
      const sk = `${n.x},${n.y},${nm}`;
      if (seen.has(sk)) continue;
      seen.add(sk);
      q.push({ p: n, mask: nm, d: d + 1 });
    }
  }
  const unreachableStars = stars.filter((s) => !reached.has(key(s))).length;
  if (pathLength < 0) errors.push('exit is not reachable');
  if (unreachableStars) errors.push(`${unreachableStars} star(s) unreachable`);
  return { solvable: errors.length === 0, pathLength, starsTotal: stars.length, unreachableStars, errors };
}

export interface MazeLevelDef {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  title?: Record<string, string>;
  requireAllStars?: boolean;
  grid?: Grid;
  generator?: GeneratorSpec;
}

const cache = new Map<string, Grid>();
export function resolveGrid(level: MazeLevelDef): Grid {
  if (level.grid) return level.grid;
  const k = JSON.stringify(level.generator);
  if (!cache.has(k)) cache.set(k, generateMaze(level.generator!));
  return cache.get(k)!;
}

export function mazeStars(opts: { collected: number; total: number; seconds: number; pathLength: number }): number {
  const par = 8 + opts.pathLength * 0.6 + opts.total * 5;
  let s = 1;
  if (opts.total === 0 || opts.collected >= opts.total) s++;
  if (opts.seconds <= par) s++;
  return s;
}

export function randomSeedRng(seed: number): Rng {
  return createRng(seed);
}
