import type { GameManifest } from '../../core/game-engine/types';

export const puzzleManifest: GameManifest = {
  id: 'puzzle-world',
  nameKey: 'games.puzzle-world.name',
  descriptionKey: 'games.puzzle-world.desc',
  area: 'brain',
  icon: '🧩',
  color: '#4fc3f7',
  minAge: 4,
  maxAge: 12,
  difficulties: ['easy', 'medium', 'hard'],
  supportsVersus: false,
  contentTypes: ['puzzle_images'],
  load: () => import('./plugin'),
};
