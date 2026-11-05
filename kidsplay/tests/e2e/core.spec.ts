import { expect, test } from '@playwright/test';
import { onboard, openGame, passGate, solveMemory } from './helpers';

test('onboarding → world → memory cards → rewards are saved', async ({ page }) => {
  await onboard(page, { name: 'Lina' });
  await openGame(page, 'brain', 'memory-cards', 'easy');
  await page.getByTestId('level-animals').click();
  await expect(page.getByTestId('memory-card')).toHaveCount(6);
  await solveMemory(page);
  await expect(page.getByTestId('result-modal')).toBeVisible();
  await page.getByTestId('result-exit').click();
  await page.getByTestId('area-close').click();
  await expect(page.getByTestId('hud-stars')).toContainText('3');
  // Progress survives a reload (IndexedDB).
  await page.reload();
  await page.getByTestId('splash').click();
  await expect(page.getByTestId('hud-stars')).toContainText('3');
});

test('two-player memory on one device ends with a winner or draw', async ({ page }) => {
  await onboard(page);
  await page.getByTestId('island-party').click();
  await page.getByTestId('game-card-memory-cards').click();
  await page.getByTestId('difficulty-easy').click();
  await expect(page.getByTestId('mode-versus')).toHaveClass(/selected/);
  await page.getByTestId('player2-name').fill('Omar');
  await page.getByTestId('lobby-play').click();
  await page.getByTestId('level-fruits').click();
  await expect(page.getByTestId('player-score-1')).toContainText('Omar');
  await solveMemory(page);
  await expect(page.getByTestId('result-modal')).toContainText(/wins|draw/);
});

test('pause, resume, restart and exit work from the game shell', async ({ page }) => {
  await onboard(page);
  await openGame(page, 'brain', 'memory-cards', 'easy');
  await page.getByTestId('level-space').click();
  await page.getByTestId('memory-card').first().click();
  await page.getByTestId('game-pause').click();
  await expect(page.getByTestId('game-memory-cards')).toHaveAttribute('data-state', 'paused');
  await page.getByTestId('pause-resume').click();
  await expect(page.getByTestId('game-memory-cards')).toHaveAttribute('data-state', 'running');
  await page.getByTestId('game-pause').click();
  await page.getByTestId('pause-restart').click();
  await expect(page.getByTestId('level-space')).toBeVisible(); // fresh instance back at theme select
  await page.getByTestId('game-exit').click();
  await expect(page.getByTestId('area-sheet-brain')).toBeVisible();
});

test('Arabic switches the whole app to RTL', async ({ page }) => {
  await onboard(page, { lang: 'ar', name: 'سارة' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('island-brain')).toContainText('أكاديمية الذكاء');
});

test('multiple profiles keep separate progress', async ({ page }) => {
  await onboard(page, { name: 'Ali' });
  await openGame(page, 'brain', 'memory-cards', 'easy');
  await page.getByTestId('level-ocean').click();
  await solveMemory(page);
  await page.getByTestId('result-exit').click();
  await page.getByTestId('area-close').click();
  await page.getByTestId('nav-profiles').click();
  await page.getByTestId('add-profile').click();
  await page.getByTestId('nickname-input').fill('Mona');
  await page.getByTestId('nickname-next').click();
  await page.getByTestId('avatar-next').click();
  await page.getByTestId('age-next').click();
  await page.getByTestId('onboarding-finish').click();
  await expect(page.getByTestId('hud-stars')).toContainText('0');
  await page.getByTestId('nav-profiles').click();
  await page.getByTestId('profile-Ali').click();
  await expect(page.getByTestId('hud-stars')).not.toContainText(/^⭐ 0$/);
});

test('parents area is behind a gate and manages settings and data', async ({ page }) => {
  await onboard(page);
  await page.getByTestId('nav-parents').click();
  await expect(page.getByTestId('gate-question')).toBeVisible();
  await passGate(page);
  await expect(page.getByTestId('parents-dashboard')).toBeVisible();
  await expect(page.getByTestId('parent-profile-Tester')).toBeVisible();
  await page.getByTestId('parents-tab-settings').click();
  await page.getByTestId('reminder-15').click();
  await expect(page.getByTestId('reminder-15')).toHaveClass(/selected/);
  await page.getByTestId('parents-tab-data').click();
  await page.getByTestId('delete-all').click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByTestId('onboarding-language')).toBeVisible();
});
