import { create } from 'zustand';
import type { Difficulty, GameMode, Locale, PlayerInfo, WorldAreaId } from '../core/game-engine/types';
import type { Profile } from '../core/storage/db';
import { profiles as profileRepo, settingsRepo } from '../core/storage/repositories';
import { audio } from '../core/audio/audio';
import { setLocale } from '../core/localization/i18n';

export interface LaunchConfig {
  gameId: string;
  difficulty: Difficulty;
  mode: GameMode;
  players: PlayerInfo[];
  options: Record<string, boolean>;
}

export type Screen =
  | { name: 'splash' }
  | { name: 'onboarding' }
  | { name: 'profiles' }
  | { name: 'world'; area?: WorldAreaId }
  | { name: 'lobby'; gameId: string; versus?: boolean }
  | { name: 'game'; config: LaunchConfig }
  | { name: 'achievements' }
  | { name: 'avatar' }
  | { name: 'settings' }
  | { name: 'parents' };

export interface AppSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  reminderMinutes: number; // 0 = off
  contentSourceUrl: string;
  activeProfileId: string | null;
}

export const DEFAULT_CONTENT_URL = (import.meta.env.VITE_CONTENT_BASE_URL as string | undefined) ?? './content';

export const DEFAULT_SETTINGS: AppSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.8,
  reminderMinutes: 0,
  contentSourceUrl: DEFAULT_CONTENT_URL,
  activeProfileId: null,
};

const LOCALE_PREF = 'kidsplay.locale'; // small non-critical preference (localStorage)

export function readLocalePref(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_PREF);
    return v === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

function writeLocalePref(l: Locale) {
  try {
    localStorage.setItem(LOCALE_PREF, l);
  } catch {
    /* private mode — ignore */
  }
}

interface AppState {
  ready: boolean;
  screen: Screen;
  history: Screen[];
  profile: Profile | null;
  profiles: Profile[];
  settings: AppSettings;
  navigate(screen: Screen, opts?: { replace?: boolean }): void;
  back(): void;
  init(): Promise<void>;
  reloadProfiles(): Promise<void>;
  selectProfile(id: string): Promise<void>;
  setProfile(p: Profile): void;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  setAppLocale(locale: Locale): Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  screen: { name: 'splash' },
  history: [],
  profile: null,
  profiles: [],
  settings: DEFAULT_SETTINGS,

  navigate(screen, opts) {
    const { screen: current, history } = get();
    set({ screen, history: opts?.replace ? history : [...history, current].slice(-20) });
  },

  back() {
    const { history, screen } = get();
    if (screen.name === 'world' && screen.area) return set({ screen: { name: 'world' } });
    const prev = history[history.length - 1];
    if (!prev || prev.name === 'splash' || prev.name === 'onboarding') {
      if (screen.name !== 'world' && get().profile) set({ screen: { name: 'world' }, history: [] });
      return;
    }
    set({ screen: prev, history: history.slice(0, -1) });
  },

  async init() {
    const settings = { ...DEFAULT_SETTINGS, ...(await settingsRepo.get<Partial<AppSettings>>('app', {})) };
    audio.applySettings(settings);
    const list = await profileRepo.list();
    const active = list.find((p) => p.id === settings.activeProfileId) ?? list[0] ?? null;
    await setLocale(active?.locale ?? readLocalePref());
    set({ settings, profiles: list, profile: active, ready: true });
  },

  async reloadProfiles() {
    const list = await profileRepo.list();
    const cur = get().profile;
    set({ profiles: list, profile: cur ? (list.find((p) => p.id === cur.id) ?? null) : null });
  },

  async selectProfile(id) {
    const p = await profileRepo.get(id);
    if (!p) return;
    set({ profile: p });
    await get().updateSettings({ activeProfileId: id });
    await setLocale(p.locale);
    writeLocalePref(p.locale);
  },

  setProfile(p) {
    set({ profile: p, profiles: get().profiles.map((x) => (x.id === p.id ? p : x)) });
  },

  async updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    audio.applySettings(settings);
    await settingsRepo.set('app', settings);
  },

  async setAppLocale(locale) {
    await setLocale(locale);
    writeLocalePref(locale);
    const p = get().profile;
    if (p && p.locale !== locale) get().setProfile(await profileRepo.update(p.id, { locale }));
  },
}));
