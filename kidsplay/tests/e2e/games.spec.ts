import { expect, test } from '@playwright/test';
import { onboard, openGame } from './helpers';

test('puzzle world: drag every piece into place', async ({ page }) => {
  await onboard(page);
  await openGame(page, 'brain', 'puzzle-world', 'easy');
  await page.getByTestId('level-animals-lion').click();
  const board = (await page.getByTestId('puzzle-board').boundingBox())!;
  const pieces = page.getByTestId('puzzle-piece');
  const n = await pieces.count();
  expect(n).toBeGreaterThanOrEqual(4);
  const side = Math.round(Math.sqrt(n));
  for (let pass = 0; pass < 5 && !(await page.getByTestId('result-modal').count()); pass++) {
    for (let i = 0; i < n; i++) {
      const el = pieces.nth(i);
      if ((await el.getAttribute('class'))!.includes('placed')) continue;
      const r = Number(await el.getAttribute('data-row'));
      const c = Number(await el.getAttribute('data-col'));
      const bb = (await el.boundingBox())!;
      const onTop = await page.evaluate(([x, y, r, c]) => {
        const e = document.elementFromPoint(x, y) as HTMLElement | null;
        return e?.dataset.row === String(r) && e?.dataset.col === String(c);
      }, [bb.x + bb.width / 2, bb.y + bb.height / 2, r, c] as const);
      if (!onTop) continue;
      await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await page.mouse.down();
      await page.mouse.move(board.x + ((c + 0.5) * board.width) / side, board.y + ((r + 0.5) * board.height) / side, { steps: 5 });
      await page.mouse.up();
    }
  }
  await expect(page.getByTestId('result-modal')).toBeVisible();
});

test('color splash: fill, draw, save and reopen from the gallery', async ({ page }) => {
  await onboard(page);
  await openGame(page, 'creative', 'color-splash');
  await page.getByTestId('cs-template-fish').click();
  const s = (await page.getByTestId('cs-surface').boundingBox())!;
  await page.getByTestId('cs-color-e53935').click();
  await page.mouse.click(s.x + s.width * 0.45, s.y + s.height * 0.5);
  await page.getByTestId('cs-tool-brush').click();
  await page.mouse.move(s.x + 30, s.y + 30);
  await page.mouse.down();
  await page.mouse.move(s.x + 120, s.y + 60, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId('cs-undo')).toBeEnabled();
  await page.getByTestId('cs-save').click();
  await expect(page.getByTestId('result-modal')).toBeVisible();
  await page.getByTestId('result-continue').click();
  await page.getByTestId('cs-back').click();
  await page.getByTestId('cs-gallery-btn').click();
  await expect(page.getByTestId('cs-artwork')).toHaveCount(1);
  await page.getByTestId('cs-open').click();
  await expect(page.getByTestId('cs-paint')).toBeVisible();
});

test('maze escape: walk the first maze to the exit with the d-pad', async ({ page }) => {
  await onboard(page);
  await openGame(page, 'adventure', 'maze-escape', 'easy');
  await page.getByTestId('level-e1').click();
  await expect(page.locator('[data-testid=maze-canvas] canvas')).toBeVisible();
  const dirs: Record<string, string> = { R: 'right', L: 'left', D: 'down', U: 'up' };
  for (const m of 'RRDDLLDDDDRRRRRR') {
    const b = (await page.getByTestId(`maze-${dirs[m]}`).boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(180);
  }
  await expect(page.getByTestId('result-modal')).toBeVisible();
});

test('math battle: answer questions to finish the race', async ({ page }) => {
  await onboard(page, { age: '10-12' });
  await openGame(page, 'brain', 'math-battle', 'easy');
  await page.getByTestId('mode-solo').isVisible();
  await page.getByTestId('math-start').click();
  // Solo race: 10 correct answers reach the finish flag.
  for (let i = 0; i < 10; i++) {
    const expr = (await page.locator('.math-expr').textContent())!;
    const e = expr.replace('= ?', '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    const ans = String(Function(`return (${e})`)());
    await page.locator(`[data-testid=math-choice][data-value="${ans}"]`).click();
    await page.waitForTimeout(1000);
  }
  await expect(page.getByTestId('result-modal')).toBeVisible();
});

test('mini chef: serve every customer in level 1', async ({ page }) => {
  await onboard(page, { age: '4-6' });
  await openGame(page, 'cooking', 'mini-chef', 'easy');
  await page.getByTestId('level-chef-1').click();
  const recipes = (await import('../../src/games/mini-chef/recipes.json', { with: { type: 'json' } })).default.levels;
  for (let c = 0; c < 10; c++) {
    await page.waitForTimeout(600);
    if (await page.getByTestId('result-modal').count()) break;
    const id = await page.getByTestId('chef-order').getAttribute('data-recipe');
    const r = recipes.find((x: { id: string }) => x.id === id)!;
    for (const s of r.steps) await page.getByTestId(`chef-ing-${s.id}`).click();
    await page.getByTestId('chef-serve').click();
    await page.waitForTimeout(1400);
  }
  await expect(page.getByTestId('result-modal')).toBeVisible();
});
