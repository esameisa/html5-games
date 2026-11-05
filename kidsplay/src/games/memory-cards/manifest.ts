import type { GameManifest } from '../../core/game-engine/types';

export const memoryManifest: GameManifest = {
  id: 'memory-cards',
  nameKey: 'games.memory-cards.name',
  descriptionKey: 'games.memory-cards.desc',
  area: 'brain',
  icon: '🃏',
  color: '#ff8fab',
  minAge: 4,
  maxAge: 12,
  difficulties: ['easy', 'medium', 'hard', 'expert'],
  supportsVersus: true,
  contentTypes: ['memory_cards'],
  options: [{ id: 'timer', labelKey: 'memory-cards:timer', default: false }],
  load: () => import('./plugin'),
};
