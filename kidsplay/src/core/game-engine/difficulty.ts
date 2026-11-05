import type { AgeGroup, Difficulty, GameResult } from './types';

const ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const BASE: Record<AgeGroup, Difficulty> = { '4-6': 'easy', '7-9': 'medium', '10-12': 'hard' };

/**
 * Adaptive difficulty: start from the age-group default, then move one step up when the
 * child recently earned mostly 3 stars, or one step down when they struggled.
 */
export function recommendDifficulty(ageGroup: AgeGroup, available: Difficulty[], history: Pick<GameResult, 'stars' | 'completed' | 'difficulty' | 'mode'>[]): Difficulty {
  const avail = ORDER.filter((d) => available.includes(d));
  if (avail.length === 0) return 'easy';
  const solo = history.filter((h) => h.mode !== 'versus').slice(-5);
  let idx = Math.max(0, avail.indexOf(BASE[ageGroup]));
  if (avail.indexOf(BASE[ageGroup]) === -1) {
    // nearest available level to the age default
    const want = ORDER.indexOf(BASE[ageGroup]);
    idx = avail.reduce((best, d, i) => (Math.abs(ORDER.indexOf(d) - want) < Math.abs(ORDER.indexOf(avail[best]) - want) ? i : best), 0);
  }
  if (solo.length >= 3) {
    const last = solo[solo.length - 1];
    const lastIdx = avail.indexOf(last.difficulty);
    if (lastIdx >= 0) idx = lastIdx;
    const avg = solo.reduce((s, h) => s + (h.completed ? h.stars : 0), 0) / solo.length;
    if (avg >= 2.6) idx = Math.min(avail.length - 1, idx + 1);
    else if (avg <= 1.2) idx = Math.max(0, idx - 1);
  }
  return avail[idx];
}
