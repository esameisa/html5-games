import { describe, expect, it } from 'vitest';
import { GameRegistry } from '../../src/core/game-registry/registry';
import { installGames, registry } from '../../src/games';
import type { GameManifest } from '../../src/core/game-engine/types';

const fake = (over: Partial<GameManifest> = {}): GameManifest => ({
  id: 'demo',
  nameKey: 'x',
  descriptionKey: 'y',
  area: 'brain',
  icon: '🎮',
  color: '#fff',
  minAge: 4,
  maxAge: 8,
  difficulties: ['easy'],
  supportsVersus: false,
  contentTypes: [],
  load: async () => ({ default: () => ({}) as never }),
  ...over,
});

describe('GameRegistry', () => {
  it('registers, lists by area and filters by age', () => {
    const r = new GameRegistry();
    r.register(fake());
    r.register(fake({ id: 'older', minAge: 10, maxAge: 12, area: 'adventure', supportsVersus: true }));
    expect(r.get('demo')?.id).toBe('demo');
    expect(r.byArea('brain').map((g) => g.id)).toEqual(['demo']);
    expect(r.byArea('party').map((g) => g.id)).toEqual(['older']);
    expect(r.forAgeGroup('4-6').map((g) => g.id)).toEqual(['demo']);
    expect(r.forAgeGroup('10-12').map((g) => g.id)).toEqual(['older']);
    expect(r.isSuitable('older', '4-6')).toBe(false);
  });

  it('rejects duplicates and invalid manifests', () => {
    const r = new GameRegistry();
    r.register(fake());
    expect(() => r.register(fake())).toThrow(/already registered/);
    expect(() => r.register(fake({ id: 'Bad Id' }))).toThrow(/Invalid game id/);
    expect(() => r.register(fake({ id: 'ages', minAge: 9, maxAge: 5 }))).toThrow(/age range/);
    expect(() => r.register(fake({ id: 'nodiff', difficulties: [] }))).toThrow(/difficulty/);
  });

  it('installs all six bundled games in the right world areas', () => {
    installGames();
    const ids = registry.all().map((g) => g.id).sort();
    expect(ids).toEqual(['color-splash', 'math-battle', 'maze-escape', 'memory-cards', 'mini-chef', 'puzzle-world']);
    expect(registry.byArea('creative').map((g) => g.id)).toEqual(['color-splash']);
    expect(registry.byArea('brain').map((g) => g.id).sort()).toEqual(['math-battle', 'memory-cards', 'puzzle-world']);
    expect(registry.byArea('adventure').map((g) => g.id)).toEqual(['maze-escape']);
    expect(registry.byArea('cooking').map((g) => g.id)).toEqual(['mini-chef']);
    expect(registry.byArea('party').map((g) => g.id).sort()).toEqual(['math-battle', 'memory-cards']);
  });

  it('lazy-loads every game module and creates a plugin with the base contract', async () => {
    installGames();
    // Maze Escape needs a real <canvas> (Phaser) and is covered by the Playwright suite.
    for (const m of registry.all().filter((g) => g.id !== 'maze-escape')) {
      const mod = await m.load();
      expect(typeof mod.default).toBe('function');
    }
  }, 30_000);
});
