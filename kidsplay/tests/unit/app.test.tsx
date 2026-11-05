import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { App } from '../../src/app/App';
import { useApp, DEFAULT_SETTINGS } from '../../src/app/store';
import { i18n, setLocale } from '../../src/core/localization/i18n';
import { installGames } from '../../src/games';
import { resetDatabase } from '../../src/core/storage/db';
import { profiles } from '../../src/core/storage/repositories';
import { ParentalGate, makeGateQuestion } from '../../src/shared/components/ParentalGate';

installGames();

// jsdom lacks these browser APIs used by the world map / games.
class RO {
  observe() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver ??= RO;

const renderApp = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  );

describe('app navigation', () => {
  beforeEach(async () => {
    await resetDatabase();
    await setLocale('en');
    useApp.setState({ ready: false, screen: { name: 'splash' }, history: [], profile: null, profiles: [], settings: DEFAULT_SETTINGS });
    await useApp.getState().init();
  });

  it('first launch: onboarding creates a profile and opens the world', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('splash'));
    fireEvent.click(await screen.findByTestId('onboarding-start'));
    fireEvent.click(screen.getByTestId('lang-ar'));
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    fireEvent.click(screen.getByTestId('lang-en'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByTestId('nickname-input'), { target: { value: 'Noor' } });
    fireEvent.click(screen.getByTestId('nickname-next'));
    fireEvent.click(screen.getByTestId('char-fox'));
    fireEvent.click(screen.getByTestId('avatar-next'));
    fireEvent.click(screen.getByTestId('age-10-12'));
    fireEvent.click(screen.getByTestId('age-next'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('onboarding-finish'));
    });
    expect(await screen.findByTestId('world-screen')).toBeInTheDocument();
    const saved = await profiles.list();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ nickname: 'Noor', ageGroup: '10-12', locale: 'en' });
    expect(saved[0].avatar.character).toBe('fox');
  });

  it('world → area → lobby → back, and settings/achievements screens open', async () => {
    const p = await profiles.create({ nickname: 'Sam', avatar: { character: 'cat', color: '#fff', hat: 'none', accessory: 'none' }, ageGroup: '7-9', locale: 'en' });
    await useApp.getState().selectProfile(p.id);
    await act(async () => useApp.getState().navigate({ name: 'world' }, { replace: true }));
    renderApp();
    fireEvent.click(await screen.findByTestId('island-brain'));
    expect(await screen.findByTestId('area-sheet-brain')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-memory-cards')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-puzzle-world')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-math-battle')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('game-card-memory-cards'));
    expect(await screen.findByTestId('lobby-memory-cards')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('difficulty-medium').getAttribute('aria-checked')).toBe('true')); // age default
    act(() => useApp.getState().back());
    expect(await screen.findByTestId('world-screen')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nav-achievements'));
    expect(await screen.findByTestId('achievements-screen')).toBeInTheDocument();
    act(() => useApp.getState().back());
    fireEvent.click(await screen.findByTestId('nav-settings'));
    expect(await screen.findByTestId('settings-screen')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-lang-ar'));
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect((await profiles.get(p.id))?.locale).toBe('ar');
  });

  it('party arena lists only local multiplayer games', async () => {
    const p = await profiles.create({ nickname: 'Duo', avatar: { character: 'cat', color: '#fff', hat: 'none', accessory: 'none' }, ageGroup: '7-9', locale: 'en' });
    await useApp.getState().selectProfile(p.id);
    await act(async () => useApp.getState().navigate({ name: 'world', area: 'party' }, { replace: true }));
    renderApp();
    expect(await screen.findByTestId('area-sheet-party')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-memory-cards')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-math-battle')).toBeInTheDocument();
    expect(screen.queryByTestId('game-card-maze-escape')).toBeNull();
  });
});

describe('parental gate', () => {
  it('generates adult-level questions', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeGateQuestion();
      expect(q.a).toBeGreaterThanOrEqual(11);
      expect(q.answer).toBe(q.a * q.b);
    }
  });

  it('passes only with the correct answer', async () => {
    let passed = false;
    render(
      <I18nextProvider i18n={i18n}>
        <ParentalGate onPass={() => (passed = true)} onCancel={() => {}} />
      </I18nextProvider>,
    );
    const type = (s: string) => [...s].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));
    type('1');
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(passed).toBe(false);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const [a, b] = screen.getByTestId('gate-question').textContent!.match(/\d+/g)!.map(Number);
    type(String(a * b));
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(passed).toBe(true);
  });
});
