import type { GameManifest } from '../../core/game-engine/types';

export const chefManifest: GameManifest = {
  id: 'mini-chef',
  nameKey: 'games.mini-chef.name',
  descriptionKey: 'games.mini-chef.desc',
  area: 'cooking',
  icon: '👩‍🍳',
  color: '#ff8a65',
  minAge: 4,
  maxAge: 12,
  difficulties: ['easy', 'medium', 'hard'],
  supportsVersus: false,
  contentTypes: ['recipes'],
  // Timed challenges are optional and never offered to the youngest players.
  options: [{ id: 'timed', labelKey: 'mini-chef:timed', default: false, ageGroups: ['7-9', '10-12'] }],
  load: () => import('./plugin'),
};
