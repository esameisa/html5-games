import type { GameManifest } from '../../core/game-engine/types';

export const colorManifest: GameManifest = {
  id: 'color-splash',
  nameKey: 'games.color-splash.name',
  descriptionKey: 'games.color-splash.desc',
  area: 'creative',
  icon: '🎨',
  color: '#ffb74d',
  minAge: 4,
  maxAge: 12,
  difficulties: ['easy'],
  supportsVersus: false,
  contentTypes: ['coloring_templates'],
  load: () => import('./plugin'),
};
