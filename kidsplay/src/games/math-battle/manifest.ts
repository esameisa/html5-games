import type { GameManifest } from '../../core/game-engine/types';

export const mathManifest: GameManifest = {
  id: 'math-battle',
  nameKey: 'games.math-battle.name',
  descriptionKey: 'games.math-battle.desc',
  area: 'brain',
  icon: '🏁',
  color: '#9575cd',
  minAge: 4,
  maxAge: 12,
  difficulties: ['easy', 'medium', 'hard', 'expert'],
  supportsVersus: true,
  contentTypes: ['math_questions'],
  options: [{ id: 'timer', labelKey: 'math-battle:timer', default: false, ageGroups: ['7-9', '10-12'] }],
  load: () => import('./plugin'),
};
