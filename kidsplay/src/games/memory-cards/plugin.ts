import { createReactGame } from '../../core/game-engine/reactGame';
import { registerGameStrings } from '../../core/localization/i18n';
import MemoryGame from './MemoryGame';
import { memoryStrings } from './i18n';

export default createReactGame(
  {
    id: 'memory-cards',
    name: 'Memory Cards',
    minAge: 4,
    maxAge: 12,
    preload: async () => registerGameStrings('memory-cards', memoryStrings),
  },
  MemoryGame,
);
