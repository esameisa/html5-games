import type { GameResult } from '../game-engine/types';
import type { Profile } from '../storage/db';

export interface AchievementStats {
  totalStars: number;
  gamesPlayed: number;
  distinctGames: number;
  perfectRounds: number;
  versusRounds: number;
  completedByGame: Record<string, number>;
  statTotals: Record<string, number>; // summed `stats` fields, e.g. pairs, orders
  artworks: number;
  level: number;
}

export interface AchievementDef {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  check(s: AchievementStats): boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_game', icon: '🎉', titleKey: 'ach.first_game', descKey: 'ach.first_game_d', check: (s) => s.gamesPlayed >= 1 },
  { id: 'perfect', icon: '🌟', titleKey: 'ach.perfect', descKey: 'ach.perfect_d', check: (s) => s.perfectRounds >= 1 },
  { id: 'stars_25', icon: '⭐', titleKey: 'ach.stars_25', descKey: 'ach.stars_25_d', check: (s) => s.totalStars >= 25 },
  { id: 'stars_100', icon: '💫', titleKey: 'ach.stars_100', descKey: 'ach.stars_100_d', check: (s) => s.totalStars >= 100 },
  { id: 'explorer', icon: '🧭', titleKey: 'ach.explorer', descKey: 'ach.explorer_d', check: (s) => s.distinctGames >= 6 },
  { id: 'memory_master', icon: '🧠', titleKey: 'ach.memory_master', descKey: 'ach.memory_master_d', check: (s) => (s.completedByGame['memory-cards'] ?? 0) >= 10 },
  { id: 'puzzle_pro', icon: '🧩', titleKey: 'ach.puzzle_pro', descKey: 'ach.puzzle_pro_d', check: (s) => (s.completedByGame['puzzle-world'] ?? 0) >= 5 },
  { id: 'artist', icon: '🎨', titleKey: 'ach.artist', descKey: 'ach.artist_d', check: (s) => s.artworks >= 3 },
  { id: 'maze_runner', icon: '🏃', titleKey: 'ach.maze_runner', descKey: 'ach.maze_runner_d', check: (s) => (s.completedByGame['maze-escape'] ?? 0) >= 10 },
  { id: 'math_whiz', icon: '🔢', titleKey: 'ach.math_whiz', descKey: 'ach.math_whiz_d', check: (s) => (s.statTotals.correct ?? 0) >= 50 },
  { id: 'chef', icon: '👩‍🍳', titleKey: 'ach.chef', descKey: 'ach.chef_d', check: (s) => (s.statTotals.orders ?? 0) >= 20 },
  { id: 'party', icon: '🎈', titleKey: 'ach.party', descKey: 'ach.party_d', check: (s) => s.versusRounds >= 3 },
  { id: 'level_5', icon: '🏅', titleKey: 'ach.level_5', descKey: 'ach.level_5_d', check: (s) => s.level >= 5 },
];

export function buildStats(profile: Pick<Profile, 'stars'>, history: GameResult[], artworks: number, level: number): AchievementStats {
  const completedByGame: Record<string, number> = {};
  const statTotals: Record<string, number> = {};
  const games = new Set<string>();
  let perfect = 0;
  let versus = 0;
  for (const r of history) {
    games.add(r.gameId);
    if (r.completed) completedByGame[r.gameId] = (completedByGame[r.gameId] ?? 0) + 1;
    if (r.completed && r.stars >= 3) perfect++;
    if (r.mode === 'versus') versus++;
    for (const [k, v] of Object.entries(r.stats ?? {})) statTotals[k] = (statTotals[k] ?? 0) + v;
  }
  return {
    totalStars: profile.stars,
    gamesPlayed: history.length,
    distinctGames: games.size,
    perfectRounds: perfect,
    versusRounds: versus,
    completedByGame,
    statTotals,
    artworks,
    level,
  };
}

/** Returns ids of achievements that are satisfied now but were not unlocked before. */
export function newlyUnlocked(stats: AchievementStats, already: Set<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !already.has(a.id) && a.check(stats));
}
