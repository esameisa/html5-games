import { createRoot, type Root } from 'react-dom/client';
import type { ComponentType } from 'react';
import type { GameContext, GameFactory, GamePlugin } from './types';

export interface ReactGameProps {
  ctx: GameContext;
  paused: boolean;
}

interface ReactGameMeta {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
  /** Register translations, warm caches, decode images… */
  preload?: (ctx: GameContext) => Promise<void>;
}

/**
 * Adapts a React component into a `GamePlugin`. The component owns its game loop and UI;
 * the adapter maps lifecycle calls (pause/resume/restart/destroy) onto React state.
 */
export function createReactGame(meta: ReactGameMeta, Component: ComponentType<ReactGameProps>): GameFactory {
  return (ctx: GameContext): GamePlugin => {
    let root: Root | null = null;
    let paused = false;
    let runKey = 0;
    const render = () => root?.render(<Component key={runKey} ctx={ctx} paused={paused} />);
    return {
      id: meta.id,
      name: meta.name,
      minAge: meta.minAge,
      maxAge: meta.maxAge,
      async preload() {
        await meta.preload?.(ctx);
      },
      async mount(container) {
        const host = document.createElement('div');
        host.className = 'game-host';
        container.appendChild(host);
        root = createRoot(host);
      },
      start() {
        paused = false;
        render();
      },
      pause() {
        paused = true;
        render();
      },
      resume() {
        paused = false;
        render();
      },
      restart() {
        runKey++;
        paused = false;
        render();
      },
      destroy() {
        const r = root;
        root = null;
        // Unmount asynchronously-safe: React warns when unmounting during render.
        if (r) queueMicrotask(() => r.unmount());
      },
    };
  };
}
