import { createReactGame } from '../../core/game-engine/reactGame';
import PuzzleGame from './PuzzleGame';

export default createReactGame({ id: 'puzzle-world', name: 'Puzzle World', minAge: 4, maxAge: 12 }, PuzzleGame);
