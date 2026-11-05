import type { GameResult } from '../game-engine/types';

/** XP needed to reach each level: level n requires 50·n·(n+1)/2 total XP. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpForLevel(level: number): number {
  const n = level - 1;
  return (50 * n * (n + 1)) / 2;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - base, needed: next - base, ratio: (xp - base) / (next - base) };
}

export interface RewardGrant {
  stars: number; // newly earned stars (only improvements on a level count)
  coins: number;
  xp: number;
}

/**
 * Rewards are earned only by playing. Coins/XP are granted for every finished round so that
 * replaying is rewarding, while stars only count once per level (best result), which keeps
 * the star counter meaningful and avoids grind loops.
 */
export function computeReward(result: Pick<GameResult, 'stars' | 'completed' | 'mode'>, newStars: number): RewardGrant {
  const stars = Math.max(0, Math.min(3, Math.round(result.stars)));
  if (!result.completed) return { stars: 0, coins: 1, xp: 5 };
  const coins = 3 + stars * 3 + Math.max(0, newStars) * 2 + (result.mode === 'versus' ? 2 : 0);
  const xp = 10 + stars * 10;
  return { stars: Math.max(0, newStars), coins, xp };
}

export function clampStars(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.round(n)));
}
