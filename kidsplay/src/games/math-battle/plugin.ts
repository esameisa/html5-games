import { createReactGame } from '../../core/game-engine/reactGame';
import MathBattle from './MathBattle';

export default createReactGame({ id: 'math-battle', name: 'Math Battle', minAge: 4, maxAge: 12 }, MathBattle);
