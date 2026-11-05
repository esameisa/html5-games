import { expect, test } from '@playwright/test';
import { onboard, openGame, passGate, solveMemory } from './helpers';

test('no third-party requests are ever made', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173')) external.push(r.url());
  });
  await onboard(page);
  await openGame(page, 'adventure', 'maze-escape', 'easy');
  await page.getByTestId('level-e1').click();
  await page.waitForTimeout(500);
  expect(external.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
});

test('works offline after the first visit (service worker)', async ({ page, context }) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await page.getByTestId('splash').click();
  await expect(page.getByTestId('world-screen')).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByTestId('splash').click();
  await openGame(page, 'brain', 'memory-cards', 'easy');
  await page.getByTestId('level-shapes').click();
  await solveMemory(page);
  await expect(page.getByTestId('result-modal')).toBeVisible();
  await page.getByTestId('result-exit').click();
  await openGame(page, 'adventure', 'maze-escape', 'easy');
  await page.getByTestId('level-e1').click();
  await expect(page.locator('[data-testid=maze-canvas] canvas')).toBeVisible();
});

test('parents can download a content pack which then appears in the game', async ({ page }) => {
  await onboard(page);
  await page.getByTestId('nav-parents').click();
  await passGate(page);
  await page.getByTestId('parents-tab-content').click();
  await page.getByTestId('content-check').click();
  await expect(page.getByTestId('remote-pack-farm-friends')).toBeVisible();
  await expect(page.getByTestId('remote-pack-future-pack')).toContainText(/newer app/);
  await page.getByTestId('install-farm-friends').click();
  await expect(page.getByTestId('content-message')).toContainText('installed');
  await expect(page.getByTestId('installed-pack-farm-friends')).toBeVisible();
  await page.getByTestId('install-ocean-puzzles').click();
  await expect(page.getByTestId('installed-pack-ocean-puzzles')).toBeVisible();
  await page.goBack().catch(() => {});
  await page.reload();
  await page.getByTestId('splash').click();
  await openGame(page, 'brain', 'memory-cards', 'easy');
  await expect(page.getByTestId('level-farm')).toBeVisible();
  await page.getByTestId('level-farm').click();
  await solveMemory(page);
  await expect(page.getByTestId('result-modal')).toBeVisible();
  await page.getByTestId('result-exit').click();
  // Downloaded puzzle images load from IndexedDB blobs
  await page.getByTestId('game-card-puzzle-world').click();
  await page.getByTestId('lobby-play').click();
  const img = page.getByTestId('level-ocean-whale').locator('img');
  await expect(img).toHaveAttribute('src', /^blob:/);
});
