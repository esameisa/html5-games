import { createReactGame } from '../../core/game-engine/reactGame';
import MazeGame from './MazeGame';

export default createReactGame({ id: 'maze-escape', name: 'Maze Escape', minAge: 5, maxAge: 12 }, MazeGame);
