import type { GameProgress, GameServices } from '../core/game-engine/types';
import { audio } from '../core/audio/audio';
import { contentLibrary } from '../core/content-packs/library';
import { gameTranslator } from '../core/localization/i18n';
import { progress as progressRepo, records } from '../core/storage/repositories';

export interface ProgressHandle {
  set(p: GameProgress): void;
}

/** Builds the sandboxed service bundle handed to a game instance. */
export function createGameServices(profileId: string, gameId: string, initial: GameProgress): { services: GameServices; progress: ProgressHandle } {
  let current = initial;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const handle: ProgressHandle = {
    set(p) {
      current = p;
      emit();
    },
  };
  const services: GameServices = {
    audio,
    t: gameTranslator(gameId),
    content: contentLibrary,
    progress: {
      get: () => current,
      async saveData(patch) {
        handle.set(await progressRepo.saveData(profileId, gameId, patch));
      },
      subscribe(l) {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    },
    storage: {
      list: (collection) => records.list(profileId, gameId, collection),
      put: (collection, record) => records.put(profileId, gameId, collection, record),
      remove: (collection, id) => records.remove(profileId, gameId, collection, id),
    },
  };
  return { services, progress: handle };
}
