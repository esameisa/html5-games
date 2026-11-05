/**
 * Game catalogue. To add a new game: create `src/games/<id>/` with a manifest, plugin,
 * strings and (optionally) a content validator + bundled pack, then register it here.
 */
import { GameRegistry } from '../core/game-registry/registry';
import { registerContentType } from '../core/content-packs/schema';
import { contentLibrary } from '../core/content-packs/library';
import { registerGameStrings } from '../core/localization/i18n';

import { memoryManifest } from './memory-cards/manifest';
import { memoryStrings } from './memory-cards/i18n';
import { validateCardSet, MEMORY_CONTENT_TYPE } from './memory-cards/content';
import memoryPack from './memory-cards/cards.json';

export const registry = new GameRegistry();

let installed = false;

export function installGames(): GameRegistry {
  if (installed) return registry;
  installed = true;

  registry.register(memoryManifest);
  registerGameStrings('memory-cards', memoryStrings);
  registerContentType(MEMORY_CONTENT_TYPE, validateCardSet);
  contentLibrary.registerBundled(memoryPack);

  return registry;
}
