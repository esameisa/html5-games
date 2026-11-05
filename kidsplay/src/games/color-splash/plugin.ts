import { createReactGame } from '../../core/game-engine/reactGame';
import ColorSplash from './ColorSplash';

export default createReactGame({ id: 'color-splash', name: 'Color Splash', minAge: 4, maxAge: 12 }, ColorSplash);
