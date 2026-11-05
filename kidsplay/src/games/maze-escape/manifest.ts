import type { GameManifest } from '../../core/game-engine/types';

export const mazeManifest: GameManifest = {
  id: 'maze-escape',
  nameKey: 'games.maze-escape.name',
  descriptionKey: 'games.maze-escape.desc',
  area: 'adventure',
  icon: '🗝️',
  color: '#81c784',
  minAge: 5,
  maxAge: 12,
  difficulties: ['easy', 'medium', 'hard'],
  supportsVersus: false,
  contentTypes: ['maze_layouts'],
  options: [{ id: 'swipe', labelKey: 'maze-escape:swipe', default: true }],
  load: () => import('./plugin'),
};
