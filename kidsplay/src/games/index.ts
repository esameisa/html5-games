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

import { puzzleManifest } from './puzzle-world/manifest';
import { puzzleStrings } from './puzzle-world/i18n';
import { validatePuzzle, PUZZLE_CONTENT_TYPE } from './puzzle-world/content';
import puzzlePack from './puzzle-world/puzzles.json';

import { colorManifest } from './color-splash/manifest';
import { colorStrings } from './color-splash/i18n';
import { validateTemplate, COLORING_CONTENT_TYPE } from './color-splash/content';
import coloringPack from './color-splash/templates.json';

import { mazeManifest } from './maze-escape/manifest';
import { mazeStrings } from './maze-escape/i18n';
import { validateMazeLevel, MAZE_CONTENT_TYPE } from './maze-escape/content';
import mazePack from './maze-escape/levels.json';

export const registry = new GameRegistry();

let installed = false;

export function installGames(): GameRegistry {
  if (installed) return registry;
  installed = true;

  registry.register(memoryManifest);
  registerGameStrings('memory-cards', memoryStrings);
  registerContentType(MEMORY_CONTENT_TYPE, validateCardSet);
  contentLibrary.registerBundled(memoryPack);

  registry.register(puzzleManifest);
  registerGameStrings('puzzle-world', puzzleStrings);
  registerContentType(PUZZLE_CONTENT_TYPE, validatePuzzle);
  contentLibrary.registerBundled(puzzlePack);

  registry.register(colorManifest);
  registerGameStrings('color-splash', colorStrings);
  registerContentType(COLORING_CONTENT_TYPE, validateTemplate);
  contentLibrary.registerBundled(coloringPack);

  registry.register(mazeManifest);
  registerGameStrings('maze-escape', mazeStrings);
  registerContentType(MAZE_CONTENT_TYPE, validateMazeLevel);
  contentLibrary.registerBundled(mazePack);

  return registry;
}
