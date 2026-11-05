import { expect, type Page } from '@playwright/test';

export async function onboard(page: Page, opts: { name?: string; age?: '4-6' | '7-9' | '10-12'; lang?: 'en' | 'ar' } = {}) {
  await page.goto('./');
  await page.getByTestId('splash').click();
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId(`lang-${opts.lang ?? 'en'}`).click();
  await page.getByTestId('onboarding-language').getByRole('button').last().click();
  await page.getByTestId('nickname-input').fill(opts.name ?? 'Tester');
  await page.getByTestId('nickname-next').click();
  await page.getByTestId('char-fox').click();
  await page.getByTestId('avatar-next').click();
  await page.getByTestId(`age-${opts.age ?? '7-9'}`).click();
  await page.getByTestId('age-next').click();
  await page.getByTestId('onboarding-finish').click();
  await expect(page.getByTestId('world-screen')).toBeVisible();
}

export async function openGame(page: Page, area: string, gameId: string, difficulty?: string) {
  await page.getByTestId(`island-${area}`).click();
  await page.getByTestId(`game-card-${gameId}`).click();
  if (difficulty) await page.getByTestId(`difficulty-${difficulty}`).click();
  await page.getByTestId('lobby-play').click();
}

export async function solveMemory(page: Page) {
  const faces = await page.getByTestId('memory-card').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.face!));
  const groups = new Map<string, number[]>();
  faces.forEach((f, i) => groups.set(f, [...(groups.get(f) ?? []), i]));
  const cards = page.getByTestId('memory-card');
  for (const [a, b] of groups.values()) {
    await cards.nth(a).click();
    await cards.nth(b).click();
  }
}

export async function passGate(page: Page) {
  const text = (await page.getByTestId('gate-question').textContent())!;
  const [a, b] = text.match(/\d+/g)!.map(Number);
  for (const d of String(a * b)) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'submit' }).click();
}

/** The splash auto-advances after ~1.6s; tap it if it is still showing. */
export async function skipSplash(page: Page) {
  await page.getByTestId('splash').click({ timeout: 1500 }).catch(() => {});
  await expect(page.getByTestId('splash')).toHaveCount(0);
}
