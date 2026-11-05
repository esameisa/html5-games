import { describe, expect, it } from 'vitest';
import pack from '../../src/games/maze-escape/levels.json';
import { generateMaze, resolveGrid, solveMaze, type MazeLevelDef } from '../../src/games/maze-escape/maze';
import { validateMazeLevel } from '../../src/games/maze-escape/content';

describe('maze escape', () => {
  it('ships at least 20 levels', () => {
    expect(pack.levels.length).toBeGreaterThanOrEqual(20);
  });

  it.each(pack.levels.map((l) => [l.id, l]))('level %s is valid and solvable', (_id, level) => {
    const lvl = level as MazeLevelDef;
    expect(validateMazeLevel(lvl as unknown as Record<string, unknown>, 0)).toEqual([]);
    const grid = resolveGrid(lvl);
    const res = solveMaze(grid);
    expect(res.errors).toEqual([]);
    expect(res.solvable).toBe(true);
    expect(res.pathLength).toBeGreaterThan(0);
    if (lvl.generator) {
      const keys = grid.join('').match(/[abc]/g)?.length ?? 0;
      const doors = grid.join('').match(/[ABC]/g)?.length ?? 0;
      expect(keys).toBe(lvl.generator.keys);
      expect(doors).toBe(lvl.generator.keys);
      expect(grid.join('').match(/\*/g)?.length ?? 0).toBe(lvl.generator.stars);
    }
  });

  it('generation is deterministic', () => {
    const spec = { seed: 42, w: 8, h: 8, keys: 2, stars: 3 };
    expect(generateMaze(spec)).toEqual(generateMaze(spec));
  });

  it('detects unsolvable mazes', () => {
    expect(solveMaze(['#####', '#S#E#', '#####']).solvable).toBe(false);
    // Door with no key
    expect(solveMaze(['#######', '#S.A.E#', '#######']).solvable).toBe(false);
    expect(solveMaze(['#######', '#SaA.E#', '#######']).solvable).toBe(true);
    // Star behind a wall
    const r = solveMaze(['#######', '#S..E##', '####*##', '#######']);
    expect(r.solvable).toBe(true);
    const r2 = solveMaze(['#######', '#S..E##', '#####*#', '#######']);
    expect(r2.unreachableStars).toBe(1);
  });
});
