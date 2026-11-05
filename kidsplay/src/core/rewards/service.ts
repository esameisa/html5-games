import { db, type Profile } from '../storage/db';
import { progress, results } from '../storage/repositories';
import type { GameProgress, GameResult } from '../game-engine/types';
import { computeReward, levelForXp, type RewardGrant } from './rewards';
import { ACHIEVEMENTS, buildStats, newlyUnlocked, type AchievementDef } from './achievements';
import { canUnlock, COSMETICS } from './cosmetics';

export interface ResultOutcome {
  reward: RewardGrant;
  profile: Profile;
  progress: GameProgress;
  achievements: AchievementDef[];
  leveledUp: boolean;
}

/** Persist a finished round: history, level progress, profile currencies and achievements. */
export async function applyResult(result: GameResult): Promise<ResultOutcome> {
  await results.add(result);
  const { progress: p, newStars } = await progress.recordLevel(result);
  const reward = computeReward(result, newStars);

  const profile = await db.transaction('rw', db.profiles, async () => {
    const current = await db.profiles.get(result.profileId);
    if (!current) throw new Error('Profile not found');
    const next: Profile = {
      ...current,
      stars: current.stars + reward.stars,
      coins: current.coins + reward.coins,
      xp: current.xp + reward.xp,
      lastPlayedAt: result.playedAt,
    };
    await db.profiles.put(next);
    return next;
  });
  const before = levelForXp(profile.xp - reward.xp);
  const achievements = await evaluateAchievements(profile);
  return { reward, profile, progress: p, achievements, leveledUp: levelForXp(profile.xp) > before };
}

export async function evaluateAchievements(profile: Profile): Promise<AchievementDef[]> {
  const history = await db.results.where('profileId').equals(profile.id).toArray();
  const artworks = await db.records.where('profileId').equals(profile.id).filter((r) => r.collection === 'artworks').count();
  const unlockedRows = await db.achievements.where('profileId').equals(profile.id).toArray();
  const already = new Set(unlockedRows.map((r) => r.achievementId));
  const stats = buildStats(profile, history, artworks, levelForXp(profile.xp));
  const fresh = newlyUnlocked(stats, already);
  const now = new Date().toISOString();
  await db.achievements.bulkPut(
    fresh.map((a) => ({ key: `${profile.id}:${a.id}`, profileId: profile.id, achievementId: a.id, unlockedAt: now })),
  );
  return fresh;
}

export async function unlockedAchievements(profileId: string): Promise<Map<string, string>> {
  const rows = await db.achievements.where('profileId').equals(profileId).toArray();
  return new Map(rows.map((r) => [r.achievementId, r.unlockedAt]));
}

export { ACHIEVEMENTS };

/** Spend earned coins on a cosmetic item. Validated inside a transaction. */
export async function unlockCosmetic(profileId: string, itemId: string): Promise<Profile> {
  const item = COSMETICS.find((c) => c.id === itemId);
  if (!item) throw new Error('Unknown item');
  return db.transaction('rw', db.profiles, async () => {
    const p = await db.profiles.get(profileId);
    if (!p) throw new Error('Profile not found');
    const check = canUnlock(item, p.coins, levelForXp(p.xp), p.unlocked);
    if (!check.ok) throw new Error(check.reason);
    const next = { ...p, coins: p.coins - item.cost, unlocked: [...p.unlocked, item.id] };
    await db.profiles.put(next);
    return next;
  });
}
