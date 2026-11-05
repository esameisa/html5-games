import { db, isQuotaError, type AvatarConfig, type GameRecord, type Profile, type StoredResult } from './db';
import type { AgeGroup, GameProgress, GameResult, LevelProgress, Locale } from '../game-engine/types';

export class StorageError extends Error {
  constructor(
    message: string,
    readonly code: 'validation' | 'quota' | 'not_found' | 'unknown',
  ) {
    super(message);
  }
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StorageError) throw err;
    if (isQuotaError(err)) throw new StorageError('Device storage is full', 'quota');
    throw new StorageError(err instanceof Error ? err.message : String(err), 'unknown');
  }
}

export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return prefix + rnd;
}

const AGE_GROUPS: AgeGroup[] = ['4-6', '7-9', '10-12'];
const LOCALES: Locale[] = ['en', 'ar'];

export function sanitizeNickname(name: string): string {
  // Nicknames only: strip control chars, collapse whitespace, cap length.
  return name
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

export function validateProfileInput(input: { nickname: string; ageGroup: string; locale: string }): string[] {
  const errors: string[] = [];
  const nick = sanitizeNickname(input.nickname);
  if (nick.length < 1) errors.push('nickname_required');
  if (!AGE_GROUPS.includes(input.ageGroup as AgeGroup)) errors.push('age_invalid');
  if (!LOCALES.includes(input.locale as Locale)) errors.push('locale_invalid');
  return errors;
}

export const profiles = {
  async create(input: { nickname: string; avatar: AvatarConfig; ageGroup: AgeGroup; locale: Locale }): Promise<Profile> {
    const errors = validateProfileInput(input);
    if (errors.length) throw new StorageError(errors.join(','), 'validation');
    const profile: Profile = {
      id: uid('p_'),
      nickname: sanitizeNickname(input.nickname),
      avatar: { ...input.avatar },
      ageGroup: input.ageGroup,
      locale: input.locale,
      stars: 0,
      coins: 0,
      xp: 0,
      unlocked: [],
      createdAt: new Date().toISOString(),
    };
    await guard(() => db.profiles.add(profile));
    return profile;
  },
  list: () => guard(() => db.profiles.orderBy('createdAt').toArray()),
  get: (id: string) => guard(() => db.profiles.get(id)),
  async update(id: string, patch: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
    return guard(async () => {
      const current = await db.profiles.get(id);
      if (!current) throw new StorageError('Profile not found', 'not_found');
      const next: Profile = { ...current, ...patch, id };
      if (patch.nickname !== undefined) {
        next.nickname = sanitizeNickname(patch.nickname);
        if (!next.nickname) throw new StorageError('nickname_required', 'validation');
      }
      await db.profiles.put(next);
      return next;
    });
  },
  /** Deletes a profile and *all* data that belongs to it. */
  async remove(id: string): Promise<void> {
    await guard(() =>
      db.transaction('rw', [db.profiles, db.progress, db.results, db.achievements, db.records], async () => {
        await db.profiles.delete(id);
        await db.progress.where('profileId').equals(id).delete();
        await db.results.where('profileId').equals(id).delete();
        await db.achievements.where('profileId').equals(id).delete();
        await db.records.where('profileId').equals(id).delete();
      }),
    );
  },
};

export function emptyProgress(profileId: string, gameId: string): GameProgress {
  return { key: `${profileId}:${gameId}`, profileId, gameId, levels: {}, data: {}, updatedAt: new Date().toISOString() };
}

/** Merge a level result into progress. Never lowers previously earned stars/completion. */
export function mergeLevel(prev: LevelProgress | undefined, r: Pick<GameResult, 'stars' | 'score' | 'completed'>): LevelProgress {
  return {
    stars: Math.max(prev?.stars ?? 0, r.completed ? r.stars : 0),
    bestScore: Math.max(prev?.bestScore ?? 0, r.score),
    completed: (prev?.completed ?? false) || r.completed,
    plays: (prev?.plays ?? 0) + 1,
  };
}

export const progress = {
  async get(profileId: string, gameId: string): Promise<GameProgress> {
    return (await guard(() => db.progress.get(`${profileId}:${gameId}`))) ?? emptyProgress(profileId, gameId);
  },
  async allForProfile(profileId: string): Promise<GameProgress[]> {
    return guard(() => db.progress.where('profileId').equals(profileId).toArray());
  },
  async recordLevel(result: GameResult): Promise<{ progress: GameProgress; newStars: number }> {
    return guard(() =>
      db.transaction('rw', db.progress, async () => {
        const p = await progress.get(result.profileId, result.gameId);
        const prev = p.levels[result.levelId];
        const merged = mergeLevel(prev, result);
        const newStars = merged.stars - (prev?.stars ?? 0);
        p.levels = { ...p.levels, [result.levelId]: merged };
        p.updatedAt = new Date().toISOString();
        await db.progress.put(p);
        return { progress: p, newStars };
      }),
    );
  },
  async saveData(profileId: string, gameId: string, patch: Record<string, unknown>): Promise<GameProgress> {
    return guard(() =>
      db.transaction('rw', db.progress, async () => {
        const p = await progress.get(profileId, gameId);
        p.data = { ...p.data, ...patch };
        p.updatedAt = new Date().toISOString();
        await db.progress.put(p);
        return p;
      }),
    );
  },
};

export const results = {
  add: (r: GameResult) => guard(() => db.results.add({ ...r } as StoredResult)),
  forProfile: (profileId: string, limit = 50) =>
    guard(() => db.results.where('profileId').equals(profileId).reverse().sortBy('playedAt').then((a) => a.slice(0, limit))),
  forGame: (profileId: string, gameId: string) =>
    guard(() => db.results.where('[profileId+gameId]').equals([profileId, gameId]).sortBy('playedAt')),
};

export const records = {
  async list<T>(profileId: string, gameId: string, collection: string): Promise<T[]> {
    const rows = await guard(() =>
      db.records.where('[profileId+gameId+collection]').equals([profileId, gameId, collection]).sortBy('createdAt'),
    );
    return rows.reverse().map((r) => r.value as T);
  },
  async put<T extends { id: string }>(profileId: string, gameId: string, collection: string, value: T): Promise<void> {
    const key = `${profileId}:${gameId}:${collection}:${value.id}`;
    const existing = await db.records.get(key);
    const rec: GameRecord = {
      key,
      profileId,
      gameId,
      collection,
      id: value.id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      value,
    };
    await guard(() => db.records.put(rec));
  },
  remove: (profileId: string, gameId: string, collection: string, id: string) =>
    guard(() => db.records.delete(`${profileId}:${gameId}:${collection}:${id}`)),
  count: (profileId: string, gameId: string, collection: string) =>
    guard(() => db.records.where('[profileId+gameId+collection]').equals([profileId, gameId, collection]).count()),
};

export const settingsRepo = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await guard(() => db.settings.get(key));
    return row ? (row.value as T) : fallback;
  },
  set: (key: string, value: unknown) => guard(() => db.settings.put({ key, value })),
};
