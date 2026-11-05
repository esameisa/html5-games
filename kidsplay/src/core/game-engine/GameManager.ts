import type { GameContext, GameManifest, GamePlugin, GameResult, GameResultInput } from './types';
import { clampStars } from '../rewards/rewards';

export type LifecycleState = 'idle' | 'loading' | 'mounted' | 'running' | 'paused' | 'destroyed' | 'error';

export interface ManagerEvents {
  onState?(state: LifecycleState): void;
  onResult?(result: GameResult): void;
  onError?(err: unknown): void;
}

type ContextInput = Omit<GameContext, 'reportResult' | 'requestExit'>;

/**
 * Owns exactly one active game instance at a time. Handles lazy loading, mount, start,
 * pause/resume, restart, exit and cleanup, and standardizes results.
 */
export class GameManager {
  private plugin: GamePlugin | null = null;
  private manifest: GameManifest | null = null;
  private container: HTMLElement | null = null;
  private ctxInput: ContextInput | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private pausedTotal = 0;
  private launchToken = 0;
  private _state: LifecycleState = 'idle';

  constructor(
    private events: ManagerEvents = {},
    private onExitRequested: () => void = () => {},
    private now: () => number = () => Date.now(),
  ) {}

  get state(): LifecycleState {
    return this._state;
  }

  get activeGameId(): string | null {
    return this.manifest?.id ?? null;
  }

  private setState(s: LifecycleState) {
    this._state = s;
    this.events.onState?.(s);
  }

  /** Load + mount + start. Any previously active game is destroyed first. */
  async launch(manifest: GameManifest, container: HTMLElement, ctx: ContextInput): Promise<void> {
    this.destroy();
    const token = ++this.launchToken;
    this.manifest = manifest;
    this.container = container;
    this.ctxInput = ctx;
    this.setState('loading');
    try {
      const mod = await manifest.load();
      if (token !== this.launchToken) return; // superseded by another launch/exit
      const plugin = mod.default(this.buildContext(ctx, token));
      await plugin.preload();
      if (token !== this.launchToken) return plugin.destroy();
      container.replaceChildren();
      await plugin.mount(container);
      if (token !== this.launchToken) return plugin.destroy();
      this.plugin = plugin;
      this.setState('mounted');
      this.resetClock();
      plugin.start();
      this.setState('running');
    } catch (err) {
      if (token !== this.launchToken) return;
      this.setState('error');
      this.events.onError?.(err);
    }
  }

  private buildContext(ctx: ContextInput, token: number): GameContext {
    return {
      ...ctx,
      reportResult: (r) => {
        if (token === this.launchToken) this.handleResult(r);
      },
      requestExit: () => {
        if (token === this.launchToken) this.onExitRequested();
      },
    };
  }

  private resetClock() {
    this.startedAt = this.now();
    this.pausedTotal = 0;
    this.pausedAt = 0;
  }

  elapsedSeconds(): number {
    const pausedNow = this._state === 'paused' ? this.now() - this.pausedAt : 0;
    return Math.max(0, Math.round((this.now() - this.startedAt - this.pausedTotal - pausedNow) / 1000));
  }

  private handleResult(r: GameResultInput) {
    if (!this.ctxInput || !this.manifest) return;
    const result: GameResult = {
      gameId: this.manifest.id,
      profileId: this.ctxInput.profileId,
      levelId: String(r.levelId),
      score: Math.max(0, Math.round(r.score)),
      stars: r.completed ? clampStars(r.stars) : 0,
      completed: r.completed,
      durationSeconds: this.elapsedSeconds(),
      playedAt: new Date(this.now()).toISOString(),
      mode: this.ctxInput.mode,
      difficulty: this.ctxInput.difficulty,
      winner: r.winner,
      stats: r.stats,
    };
    this.resetClock(); // next level starts timing now
    this.events.onResult?.(result);
  }

  pause(): void {
    if (this._state !== 'running' || !this.plugin) return;
    this.plugin.pause();
    this.pausedAt = this.now();
    this.setState('paused');
  }

  resume(): void {
    if (this._state !== 'paused' || !this.plugin) return;
    this.pausedTotal += this.now() - this.pausedAt;
    this.plugin.resume();
    this.setState('running');
  }

  /** Restart: prefers the plugin's own restart, otherwise remounts a fresh instance. */
  async restart(): Promise<void> {
    if (!this.manifest || !this.container || !this.ctxInput) return;
    if (this.plugin?.restart) {
      if (this._state === 'paused') this.resume();
      this.plugin.restart();
      this.resetClock();
      return;
    }
    await this.launch(this.manifest, this.container, this.ctxInput);
  }

  /** Destroy the active instance and release its resources. Idempotent. */
  destroy(): void {
    this.launchToken++;
    if (this.plugin) {
      try {
        this.plugin.destroy();
      } catch (err) {
        console.error('[game-manager] destroy failed', err);
      }
    }
    this.container?.replaceChildren();
    const had = this.plugin !== null || this._state !== 'idle';
    this.plugin = null;
    this.manifest = null;
    this.container = null;
    this.ctxInput = null;
    if (had) this.setState('destroyed');
  }
}
