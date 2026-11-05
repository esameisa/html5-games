import Dexie, { type Table } from 'dexie';
import type { AgeGroup, GameProgress, GameResult, Locale } from '../game-engine/types';

export interface AvatarConfig {
  character: string; // 'bunny' | 'bear' | 'cat' | 'fox' | 'dino' | 'robot'
  color: string;
  hat: string; // 'none' | item id
  accessory: string; // 'none' | item id
}

export interface Profile {
  id: string;
  nickname: string;
  avatar: AvatarConfig;
  ageGroup: AgeGroup;
  locale: Locale;
  stars: number;
  coins: number;
  xp: number;
  unlocked: string[]; // cosmetic item ids
  createdAt: string;
  lastPlayedAt?: string;
}

export interface StoredResult extends GameResult {
  id?: number;
}

export interface AchievementRecord {
  key: string; // `${profileId}:${achievementId}`
  profileId: string;
  achievementId: string;
  unlockedAt: string;
}

/** Generic per-profile, per-game record store (artwork, saved drafts…). */
export interface GameRecord {
  key: string; // `${profileId}:${gameId}:${collection}:${id}`
  profileId: string;
  gameId: string;
  collection: string;
  id: string;
  createdAt: string;
  value: unknown;
}

export type PackStatus = 'staged' | 'active' | 'disabled';

export interface InstalledPack {
  id: string;
  version: string;
  type: string;
  status: PackStatus;
  installedAt: string;
  sizeBytes: number;
  manifest: unknown; // validated ContentManifest
  previousVersion?: string;
}

export interface PackAsset {
  key: string; // `${packId}@${version}:${path}`
  packId: string;
  version: string;
  path: string;
  mime: string;
  blob: Blob;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export const DB_NAME = 'kidsplay';

export class KidsPlayDB extends Dexie {
  profiles!: Table<Profile, string>;
  progress!: Table<GameProgress, string>;
  results!: Table<StoredResult, number>;
  achievements!: Table<AchievementRecord, string>;
  records!: Table<GameRecord, string>;
  packs!: Table<InstalledPack, string>;
  packAssets!: Table<PackAsset, string>;
  settings!: Table<SettingRecord, string>;

  constructor(name = DB_NAME) {
    super(name);
    // v1 — initial schema.
    this.version(1).stores({
      profiles: 'id, createdAt',
      progress: 'key, profileId, gameId',
      results: '++id, profileId, gameId, playedAt',
      achievements: 'key, profileId',
      records: 'key, [profileId+gameId+collection], profileId',
      packs: 'id, type, status',
      packAssets: 'key, packId',
      settings: 'key',
    });
    // v2 — compound index for per-profile history queries + backfill of new profile fields.
    this.version(2)
      .stores({
        results: '++id, profileId, gameId, playedAt, [profileId+gameId]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('profiles')
          .toCollection()
          .modify((p: Partial<Profile>) => {
            p.unlocked ??= [];
            p.xp ??= 0;
            p.coins ??= 0;
            p.stars ??= 0;
          });
      });
  }
}

export let db = new KidsPlayDB();

/** Test helper: swap the database for an isolated instance. */
export function useDatabase(instance: KidsPlayDB): void {
  db = instance;
}

export async function openDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.open();
    return { ok: true };
  } catch (err) {
    // Recovery path: if the stored DB is corrupt or from an incompatible future version,
    // report it so the UI can offer a reset instead of crashing.
    console.error('[storage] failed to open database', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function resetDatabase(): Promise<void> {
  db.close();
  await Dexie.delete(db.name);
  db = new KidsPlayDB(db.name);
  await db.open();
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  persisted: boolean;
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
  return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted };
}

/** Ask the browser to keep our data (best-effort; not available everywhere). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function isQuotaError(err: unknown): boolean {
  const name = (err as { name?: string; inner?: { name?: string } })?.name;
  const inner = (err as { inner?: { name?: string } })?.inner?.name;
  return name === 'QuotaExceededError' || inner === 'QuotaExceededError';
}
