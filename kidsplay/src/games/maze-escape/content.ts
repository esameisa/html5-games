import type { LevelValidator } from '../../core/content-packs/schema';
import { solveMaze, type MazeLevelDef } from './maze';

export const MAZE_CONTENT_TYPE = 'maze_layouts';
export type MazeLevel = MazeLevelDef & { packId: string };

export const validateMazeLevel: LevelValidator = (lvl) => {
  const e: string[] = [];
  if (!['easy', 'medium', 'hard'].includes(String(lvl.difficulty))) e.push('invalid difficulty');
  const hasGrid = Array.isArray(lvl.grid);
  const gen = lvl.generator as Record<string, unknown> | undefined;
  if (hasGrid === !!gen) e.push('needs exactly one of grid or generator');
  if (hasGrid) {
    const grid = lvl.grid as unknown[];
    if (!grid.every((r) => typeof r === 'string')) e.push('grid rows must be strings');
    else if (grid.length > 61 || (grid[0] as string).length > 61) e.push('grid too large');
    else {
      const res = solveMaze(grid as string[]);
      if (!res.solvable) e.push(...res.errors.map((x) => `grid: ${x}`));
    }
  }
  if (gen) {
    for (const k of ['seed', 'w', 'h', 'keys', 'stars']) if (typeof gen[k] !== 'number') e.push(`generator.${k} must be a number`);
    if (Number(gen.w) > 30 || Number(gen.h) > 30 || Number(gen.w) < 2 || Number(gen.h) < 2) e.push('generator size out of range');
    if (Number(gen.keys) > 3 || Number(gen.keys) < 0) e.push('generator.keys must be 0..3');
  }
  return e;
};
