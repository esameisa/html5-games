import { describe, expect, it, vi } from 'vitest';
import { GameManager } from '../../src/core/game-engine/GameManager';
import type { GameContext, GameManifest, GamePlugin, GameResult } from '../../src/core/game-engine/types';

function makeGame(log: string[], opts: { restart?: boolean; delay?: number } = {}) {
  let ctxRef: GameContext | null = null;
  const manifest: GameManifest = {
    id: 'test-game',
    nameKey: 'n',
    descriptionKey: 'd',
    area: 'brain',
    icon: 'x',
    color: '#000',
    minAge: 4,
    maxAge: 12,
    difficulties: ['easy'],
    supportsVersus: true,
    contentTypes: [],
    load: async () => {
      if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay));
      return {
        default: (ctx: GameContext): GamePlugin => {
          ctxRef = ctx;
          const p: GamePlugin = {
            id: 'test-game',
            name: 'Test',
            minAge: 4,
            maxAge: 12,
            preload: async () => void log.push('preload'),
            mount: async (el) => {
              log.push('mount');
              el.appendChild(document.createElement('canvas'));
            },
            start: () => void log.push('start'),
            pause: () => void log.push('pause'),
            resume: () => void log.push('resume'),
            destroy: () => void log.push('destroy'),
          };
          if (opts.restart) p.restart = () => void log.push('restart');
          return p;
        },
      };
    },
  };
  return { manifest, ctx: () => ctxRef! };
}

const baseCtx = {
  gameId: 'test-game',
  profileId: 'p1',
  ageGroup: '7-9' as const,
  locale: 'en' as const,
  difficulty: 'medium' as const,
  mode: 'solo' as const,
  players: [{ name: 'A', color: '#f00' }],
  options: {},
  services: {} as GameContext['services'],
};

describe('GameManager lifecycle', () => {
  it('loads, mounts, starts, pauses, resumes and destroys in order', async () => {
    const log: string[] = [];
    const states: string[] = [];
    const g = makeGame(log);
    const m = new GameManager({ onState: (s) => states.push(s) });
    const el = document.createElement('div');
    await m.launch(g.manifest, el, baseCtx);
    expect(m.state).toBe('running');
    expect(el.querySelector('canvas')).not.toBeNull();
    m.pause();
    m.pause(); // idempotent
    m.resume();
    m.destroy();
    m.destroy(); // idempotent
    expect(log).toEqual(['preload', 'mount', 'start', 'pause', 'resume', 'destroy']);
    expect(states).toEqual(['loading', 'mounted', 'running', 'paused', 'running', 'destroyed']);
    expect(el.childElementCount).toBe(0); // resources cleaned up
  });

  it('never keeps two active games: launching again destroys the previous one', async () => {
    const log1: string[] = [];
    const log2: string[] = [];
    const m = new GameManager();
    const el = document.createElement('div');
    await m.launch(makeGame(log1).manifest, el, baseCtx);
    await m.launch(makeGame(log2).manifest, el, baseCtx);
    expect(log1).toContain('destroy');
    expect(log2).not.toContain('destroy');
    expect(el.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('cancels a slow launch that was superseded by exit', async () => {
    const log: string[] = [];
    const m = new GameManager();
    const el = document.createElement('div');
    const p = m.launch(makeGame(log, { delay: 30 }).manifest, el, baseCtx);
    m.destroy();
    await p;
    expect(log).not.toContain('start');
    expect(el.childElementCount).toBe(0);
  });

  it('standardizes results with duration excluding paused time', async () => {
    let now = 1_000_000;
    const results: GameResult[] = [];
    const g = makeGame([]);
    const m = new GameManager({ onResult: (r) => results.push(r) }, undefined, () => now);
    await m.launch(g.manifest, document.createElement('div'), { ...baseCtx, mode: 'versus' });
    now += 10_000;
    m.pause();
    now += 60_000; // paused time is not counted
    m.resume();
    now += 5_000;
    g.ctx().reportResult({ levelId: 'lvl-1', score: 123.6, stars: 7, completed: true, winner: 1 });
    expect(results[0]).toMatchObject({
      gameId: 'test-game',
      profileId: 'p1',
      levelId: 'lvl-1',
      score: 124,
      stars: 3, // clamped
      completed: true,
      durationSeconds: 15,
      mode: 'versus',
      difficulty: 'medium',
      winner: 1,
    });
    expect(new Date(results[0].playedAt).getTime()).toBe(now);
  });

  it('ignores results from a destroyed instance and uses plugin restart when available', async () => {
    const log: string[] = [];
    const onResult = vi.fn();
    const g = makeGame(log, { restart: true });
    const m = new GameManager({ onResult });
    await m.launch(g.manifest, document.createElement('div'), baseCtx);
    const stale = g.ctx();
    await m.restart();
    expect(log).toContain('restart');
    m.destroy();
    stale.reportResult({ levelId: 'x', score: 1, stars: 1, completed: true });
    expect(onResult).not.toHaveBeenCalled();
  });

  it('reports load errors', async () => {
    const onError = vi.fn();
    const m = new GameManager({ onError });
    const bad = { ...makeGame([]).manifest, load: async () => Promise.reject(new Error('boom')) };
    await m.launch(bad, document.createElement('div'), baseCtx);
    expect(m.state).toBe('error');
    expect(onError).toHaveBeenCalled();
  });
});
