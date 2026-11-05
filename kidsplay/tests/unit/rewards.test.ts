import { beforeEach, describe, expect, it } from 'vitest';
import { computeReward, levelForXp, levelProgress, xpForLevel } from '../../src/core/rewards/rewards';
import { ACHIEVEMENTS, buildStats, newlyUnlocked } from '../../src/core/rewards/achievements';
import { canUnlock, COSMETICS, isOwned } from '../../src/core/rewards/cosmetics';
import { applyResult, unlockCosmetic, unlockedAchievements } from '../../src/core/rewards/service';
import { resetDatabase } from '../../src/core/storage/db';
import { profiles, records } from '../../src/core/storage/repositories';
import type { GameResult } from '../../src/core/game-engine/types';

const avatar = { character: 'bear', color: '#ffb74d', hat: 'none', accessory: 'none' };
const res = (profileId: string, over: Partial<GameResult> = {}): GameResult => ({
  gameId: 'memory-cards',
  profileId,
  levelId: 'animals:easy',
  score: 100,
  stars: 3,
  completed: true,
  durationSeconds: 20,
  playedAt: new Date().toISOString(),
  mode: 'solo',
  difficulty: 'easy',
  ...over,
});

describe('reward rules', () => {
  it('levels grow with XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpForLevel(2)).toBe(50);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(150)).toBe(3);
    expect(levelProgress(75)).toMatchObject({ level: 2, current: 25, needed: 100 });
  });

  it('only counts newly earned stars and rewards completion', () => {
    expect(computeReward({ stars: 3, completed: true, mode: 'solo' }, 3)).toEqual({ stars: 3, coins: 3 + 9 + 6, xp: 40 });
    expect(computeReward({ stars: 3, completed: true, mode: 'solo' }, 0).stars).toBe(0);
    expect(computeReward({ stars: 0, completed: false, mode: 'solo' }, 0)).toEqual({ stars: 0, coins: 1, xp: 5 });
  });

  it('achievements unlock from stats', () => {
    const stats = buildStats({ stars: 30 }, [res('p'), res('p', { gameId: 'math-battle', mode: 'versus', stats: { correct: 60 } })], 3, 2);
    const ids = newlyUnlocked(stats, new Set()).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['first_game', 'perfect', 'stars_25', 'artist', 'math_whiz']));
    expect(ids).not.toContain('explorer');
    expect(newlyUnlocked(stats, new Set(ids))).toHaveLength(0);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('cosmetics require earned coins or levels — never real money', () => {
    const crown = COSMETICS.find((c) => c.id === 'hat_crown')!;
    expect(canUnlock(crown, 1000, 1, [])).toEqual({ ok: false, reason: 'level' });
    expect(canUnlock(crown, 10, 5, [])).toEqual({ ok: false, reason: 'coins' });
    expect(canUnlock(crown, 100, 5, [])).toEqual({ ok: true });
    expect(isOwned(COSMETICS.find((c) => c.id === 'hat_cap')!, [])).toBe(true);
  });
});

describe('reward service (IndexedDB)', () => {
  beforeEach(() => resetDatabase());

  it('applies results to profile currencies, progress and achievements', async () => {
    const p = await profiles.create({ nickname: 'Kid', avatar, ageGroup: '7-9', locale: 'en' });
    const first = await applyResult(res(p.id));
    expect(first.reward.stars).toBe(3);
    expect(first.profile.stars).toBe(3);
    expect(first.profile.coins).toBeGreaterThan(0);
    expect(first.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['first_game', 'perfect']));
    const again = await applyResult(res(p.id));
    expect(again.reward.stars).toBe(0); // replay: no star farming
    expect(again.profile.stars).toBe(3);
    expect(again.profile.coins).toBeGreaterThan(first.profile.coins);
    expect(again.achievements).toHaveLength(0);
    expect((await unlockedAchievements(p.id)).size).toBeGreaterThanOrEqual(2);
  });

  it('counts saved artworks for the artist achievement', async () => {
    const p = await profiles.create({ nickname: 'Art', avatar, ageGroup: '4-6', locale: 'en' });
    for (const id of ['a', 'b', 'c']) await records.put(p.id, 'color-splash', 'artworks', { id });
    const out = await applyResult(res(p.id, { gameId: 'color-splash', levelId: 'cat' }));
    expect(out.achievements.map((a) => a.id)).toContain('artist');
  });

  it('spends coins on cosmetics atomically', async () => {
    const p = await profiles.create({ nickname: 'Shop', avatar, ageGroup: '7-9', locale: 'en' });
    await expect(unlockCosmetic(p.id, 'hat_bow')).rejects.toThrow('coins');
    await profiles.update(p.id, { coins: 20 });
    const after = await unlockCosmetic(p.id, 'hat_bow');
    expect(after.coins).toBe(5);
    expect(after.unlocked).toContain('hat_bow');
    await expect(unlockCosmetic(p.id, 'hat_bow')).rejects.toThrow('owned');
  });
});
