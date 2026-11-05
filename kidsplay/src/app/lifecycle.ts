import { Capacitor } from '@capacitor/core';
import { audio } from '../core/audio/audio';

type AppEvent = 'background' | 'foreground' | 'backButton';

class Emitter {
  private map = new Map<AppEvent, Set<() => void>>();
  on(e: AppEvent, fn: () => void): () => void {
    if (!this.map.has(e)) this.map.set(e, new Set());
    this.map.get(e)!.add(fn);
    return () => this.map.get(e)?.delete(fn);
  }
  emit(e: AppEvent): void {
    this.map.get(e)?.forEach((fn) => fn());
  }
  count(e: AppEvent): number {
    return this.map.get(e)?.size ?? 0;
  }
}

export const appEvents = new Emitter();

let installed = false;

/**
 * Wires platform lifecycle: background/foreground (pauses games and audio), the Android
 * hardware back button, status bar styling and splash screen hiding on native platforms.
 */
export async function installLifecycle(onBack: () => void): Promise<void> {
  if (installed) return;
  installed = true;

  const setActive = (active: boolean) => {
    audio.setAppActive(active);
    appEvents.emit(active ? 'foreground' : 'background');
  };
  document.addEventListener('visibilitychange', () => setActive(document.visibilityState === 'visible'));

  // Unlock Web Audio on the very first gesture (mobile autoplay policy).
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  if (!Capacitor.isNativePlatform()) return;
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ]);
  void App.addListener('appStateChange', ({ isActive }) => setActive(isActive));
  void App.addListener('backButton', () => {
    if (appEvents.count('backButton') > 0) appEvents.emit('backButton');
    else onBack();
  });
  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === 'android') await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* status bar plugin unavailable */
  }
  await SplashScreen.hide();
}

export async function minimizeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  const { App } = await import('@capacitor/app');
  await App.minimizeApp();
}
