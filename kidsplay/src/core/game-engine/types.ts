/**
 * Shared game contracts. Every mini-game implements `GamePlugin` and is created by a
 * `GameFactory` that receives a `GameContext` (services + configuration). Games never
 * import each other; they only depend on these contracts and on `src/core` services.
 */
import type { AudioService } from '../audio/audio';

export type Locale = 'en' | 'ar';
export type AgeGroup = '4-6' | '7-9' | '10-12';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameMode = 'solo' | 'versus';
export type WorldAreaId = 'creative' | 'brain' | 'adventure' | 'cooking' | 'party';

export interface LocalizedText {
  en: string;
  ar: string;
  [lang: string]: string;
}

/** The base lifecycle contract from the product specification. */
export interface GamePlugin {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;

  preload(): Promise<void>;
  mount(container: HTMLElement): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  /** Optional: restart the current level without a full remount. */
  restart?(): void;
}

export interface PlayerInfo {
  name: string;
  color: string;
  avatarCharacter?: string;
}

/** What a game reports when a level/round finishes. The manager fills in the rest. */
export interface GameResultInput {
  levelId: string;
  score: number;
  stars: number; // 0..3
  completed: boolean;
  /** Versus mode: index of the winning player, or -1 for a draw. */
  winner?: number;
  /** Game-specific stats used by achievements (e.g. { pairs: 6 }). */
  stats?: Record<string, number>;
}

/** Standardized result stored in IndexedDB. */
export interface GameResult {
  gameId: string;
  profileId: string;
  levelId: string;
  score: number;
  stars: number;
  completed: boolean;
  durationSeconds: number;
  playedAt: string;
  mode: GameMode;
  difficulty: Difficulty;
  winner?: number;
  stats?: Record<string, number>;
}

export interface LevelProgress {
  stars: number;
  bestScore: number;
  completed: boolean;
  plays: number;
}

export interface GameProgress {
  key: string; // `${profileId}:${gameId}`
  profileId: string;
  gameId: string;
  levels: Record<string, LevelProgress>;
  /** Free-form, game-owned persisted state (unlocked recipes, last theme…). */
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface ProgressService {
  get(): GameProgress;
  saveData(patch: Record<string, unknown>): Promise<void>;
  /** Notified whenever progress changes (e.g. after a result was saved). */
  subscribe(listener: () => void): () => void;
}

export interface ContentService {
  /** All active content items of a given content type (bundled + installed packs). */
  items<T = unknown>(type: string): T[];
  /** Resolve an asset path declared by a pack to a URL usable in <img>/canvas. */
  assetUrl(packId: string | undefined, path: string): string;
}

export interface GameStorageService {
  /** Per-profile, per-game record storage (e.g. artwork). */
  list<T>(collection: string): Promise<T[]>;
  put<T extends { id: string }>(collection: string, record: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}

export interface GameServices {
  audio: AudioService;
  t: (key: string, options?: Record<string, unknown>) => string;
  progress: ProgressService;
  content: ContentService;
  storage: GameStorageService;
}

export interface GameContext {
  gameId: string;
  profileId: string;
  ageGroup: AgeGroup;
  locale: Locale;
  difficulty: Difficulty;
  mode: GameMode;
  players: PlayerInfo[];
  /** Optional player-selected toggles (timer, swipe controls…). */
  options: Record<string, boolean>;
  services: GameServices;
  /** Report a finished level/round. */
  reportResult(result: GameResultInput): void;
  /** The game asks the shell to exit back to the world. */
  requestExit(): void;
}

export type GameFactory = (ctx: GameContext) => GamePlugin;

export interface GameOptionDef {
  id: string;
  labelKey: string;
  default: boolean;
  /** Only offered to these age groups (all if omitted). */
  ageGroups?: AgeGroup[];
}

/** Static metadata registered in the Game Registry. Module code is lazy-loaded. */
export interface GameManifest {
  id: string;
  nameKey: string;
  descriptionKey: string;
  area: WorldAreaId;
  icon: string;
  color: string;
  minAge: number;
  maxAge: number;
  difficulties: Difficulty[];
  supportsVersus: boolean;
  /** Content-pack type this game consumes (enables downloadable packs). */
  contentTypes: string[];
  options?: GameOptionDef[];
  load: () => Promise<{ default: GameFactory }>;
}
