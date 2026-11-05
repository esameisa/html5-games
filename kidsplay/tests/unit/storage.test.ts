import { beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { db, KidsPlayDB, resetDatabase } from '../../src/core/storage/db';
import { mergeLevel, profiles, progress, records, results, sanitizeNickname, settingsRepo, StorageError, validateProfileInput } from '../../src/core/storage/repositories';
import type { GameResult } from '../../src/core/game-engine/types';

const avatar = { character: 'bear', color: '#ffb74d', hat: 'none', accessory: 'none' };
const result = (over: Partial<GameResult> = {}): GameResult => ({
  gameId: 'memory-cards',
  profileId: 'p',
  levelId: 'animals:easy',
  score: 100,
  stars: 2,
  completed: true,
  durationSeconds: 30,
  playedAt: new Date().toISOString(),
  mode: 'solo',
  difficulty: 'easy',
  ...over,
});

describe('profiles', () => {
  beforeEach(() => resetDatabase());

  it('validates input and never stores personal data beyond a nickname', async () => {
    expect(validateProfileInput({ nickname: ' ', ageGroup: '7-9', locale: 'en' })).toContain('nickname_required');
    expect(validateProfileInput({ nickname: 'x', ageGroup: '3-5', locale: 'fr' })).toEqual(['age_invalid', 'locale_invalid']);
    expect(sanitizeNickname('  <b>Super   Star</b> with a very long name ')).toBe('bSuper Star/b wi');
    await expect(profiles.create({ nickname: '', avatar, ageGroup: '7-9', locale: 'en' })).rejects.toBeInstanceOf(StorageError);
    const p = await profiles.create({ nickname: 'Zara', avatar, ageGroup: '7-9', locale: 'ar' });
    expect(Object.keys(p).sort()).toEqual(['ageGroup', 'avatar', 'coins', 'createdAt', 'id', 'locale', 'nickname', 'stars', 'unlocked', 'xp']);
  });

  it('keeps progress, history and records isolated per profile and deletes them with the profile', async () => {
    const a = await profiles.create({ nickname: 'A', avatar, ageGroup: '4-6', locale: 'en' });
    const b = await profiles.create({ nickname: 'B', avatar, ageGroup: '10-12', locale: 'en' });
    await progress.recordLevel(result({ profileId: a.id }));
    await results.add(result({ profileId: a.id }));
    await records.put(a.id, 'color-splash', 'artworks', { id: 'x' });
    expect((await progress.get(b.id, 'memory-cards')).levels).toEqual({});
    expect(await results.forProfile(b.id)).toHaveLength(0);
    expect((await progress.get(a.id, 'memory-cards')).levels['animals:easy'].stars).toBe(2);

    await profiles.remove(a.id);
    expect(await profiles.get(a.id)).toBeUndefined();
    expect(await db.progress.where('profileId').equals(a.id).count()).toBe(0);
    expect(await db.results.where('profileId').equals(a.id).count()).toBe(0);
    expect(await db.records.where('profileId').equals(a.id).count()).toBe(0);
    expect(await profiles.get(b.id)).toBeDefined();
  });
});

describe('progress', () => {
  beforeEach(() => resetDatabase());

  it('never loses completed progress or lowers best stars', async () => {
    expect(mergeLevel({ stars: 3, bestScore: 500, completed: true, plays: 2 }, { stars: 1, score: 100, completed: false })).toEqual({
      stars: 3,
      bestScore: 500,
      completed: true,
      plays: 3,
    });
    const { newStars } = await progress.recordLevel(result({ stars: 2 }));
    expect(newStars).toBe(2);
    const second = await progress.recordLevel(result({ stars: 3 }));
    expect(second.newStars).toBe(1);
    const third = await progress.recordLevel(result({ stars: 1 }));
    expect(third.newStars).toBe(0);
    expect(third.progress.levels['animals:easy']).toMatchObject({ stars: 3, completed: true, plays: 3 });
  });

  it('stores game-owned data alongside levels', async () => {
    await progress.saveData('p', 'mini-chef', { recipesUnlocked: ['pizza'] });
    await progress.recordLevel(result({ gameId: 'mini-chef', levelId: 'chef-1' }));
    const p = await progress.get('p', 'mini-chef');
    expect(p.data.recipesUnlocked).toEqual(['pizza']);
    expect(p.levels['chef-1'].completed).toBe(true);
  });
});

describe('IndexedDB persistence and migrations', () => {
  it('persists across database re-open', async () => {
    await resetDatabase();
    await profiles.create({ nickname: 'Persist', avatar, ageGroup: '7-9', locale: 'en' });
    await settingsRepo.set('app', { musicEnabled: false });
    db.close();
    const reopened = new KidsPlayDB(db.name);
    await reopened.open();
    expect((await reopened.profiles.toArray()).map((p) => p.nickname)).toEqual(['Persist']);
    expect((await reopened.settings.get('app'))?.value).toEqual({ musicEnabled: false });
    reopened.close();
    await db.open();
  });

  it('migrates a v1 database to v2 and backfills missing profile fields', async () => {
    const name = 'migration-test';
    await Dexie.delete(name);
    const v1 = new Dexie(name);
    v1.version(1).stores({
      profiles: 'id, createdAt',
      progress: 'key, profileId, gameId',
      results: '++id, profileId, gameId, playedAt',
      achievements: 'key, profileId',
      records: 'key, [profileId+gameId+collection], profileId',
      packs: 'id, type, status',
      packAssets: 'key, packId',
      settings: 'key',
    });
    await v1.open();
    await v1.table('profiles').add({ id: 'old', nickname: 'Old', createdAt: '2020' });
    await v1.table('results').add({ profileId: 'old', gameId: 'g', playedAt: '2020', stars: 3 });
    v1.close();

    const v2 = new KidsPlayDB(name);
    await v2.open();
    expect(v2.verno).toBe(2);
    const p = await v2.profiles.get('old');
    expect(p).toMatchObject({ nickname: 'Old', unlocked: [], xp: 0, coins: 0, stars: 0 });
    expect(await v2.results.where('[profileId+gameId]').equals(['old', 'g']).count()).toBe(1);
    v2.close();
  });
});
