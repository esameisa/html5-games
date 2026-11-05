import { createReactGame } from '../../core/game-engine/reactGame';
import MiniChef from './MiniChef';

export default createReactGame({ id: 'mini-chef', name: 'Mini Chef', minAge: 4, maxAge: 12 }, MiniChef);
