import { useSyncExternalStore } from 'react';
import type { GameContext, GameProgress } from './types';

/** React hook: live view of this game's saved progress for the active profile. */
export function useGameProgress(ctx: GameContext): GameProgress {
  const p = ctx.services.progress;
  return useSyncExternalStore(p.subscribe, p.get, p.get);
}
