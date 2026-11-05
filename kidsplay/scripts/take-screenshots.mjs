#!/usr/bin/env node
/**
 * Captures README screenshots of the world map and every game.
 * Requires a running build: `npm run build && npm run preview -- --port 4173`
 * Usage: node scripts/take-screenshots.mjs [baseUrl]
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173/';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
const recipes = JSON.parse(readFileSync(new URL('../src/games/mini-chef/recipes.json', import.meta.url))).levels;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const tid = (id) => page.getByTestId(id);
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('saved', name);
};
const home = async () => {
  if (await tid('result-modal').count()) await tid('result-exit').click();
  else await tid('game-exit').click();
  if (await tid('area-close').count()) await tid('area-close').click();
};
const open = async (area, game, diff) => {
  await tid(`island-${area}`).click();
  await tid(`game-card-${game}`).click();
  if (diff) await tid(`difficulty-${diff}`).click();
  await tid('lobby-play').click();
};

await page.goto(BASE);
await tid('splash').click();
await tid('onboarding-start').click();
await tid('onboarding-language').getByRole('button').last().click();
await tid('nickname-input').fill('Lina');
await tid('nickname-next').click();
await tid('char-bunny').click();
await tid('avatar-next').click();
await tid('age-7-9').click();
await tid('age-next').click();
await tid('onboarding-finish').click();
await tid('world-screen').waitFor();
await shot('world');

// Memory Cards: flip a few matching pairs
await open('brain', 'memory-cards', 'medium');
await tid('level-animals').click();
const faces = await tid('memory-card').evaluateAll((els) => els.map((e) => e.dataset.face));
const pairs = {};
faces.forEach((f, i) => (pairs[f] ??= []).push(i));
for (const [a, b] of Object.values(pairs).slice(0, 3)) {
  await tid('memory-card').nth(a).click();
  await tid('memory-card').nth(b).click();
}
await tid('memory-card').nth(Object.values(pairs)[4][0]).click();
await shot('memory-cards');
await home();

// Puzzle World: place some pieces
await open('brain', 'puzzle-world', 'medium');
await tid('level-dinosaurs-trex').click();
const board = await tid('puzzle-board').boundingBox();
const pieces = tid('puzzle-piece');
const n = await pieces.count();
const rows = (await pieces.evaluateAll((els) => Math.max(...els.map((e) => +e.dataset.row)))) + 1;
const cols = n / rows;
let placed = 0;
for (let i = 0; i < n && placed < Math.floor(n / 2); i++) {
  const el = pieces.nth(i);
  const r = +(await el.getAttribute('data-row'));
  const c = +(await el.getAttribute('data-col'));
  const bb = await el.boundingBox();
  const top = await page.evaluate(([x, y, r, c]) => { const e = document.elementFromPoint(x, y); return e?.dataset.row == r && e?.dataset.col == c; }, [bb.x + bb.width / 2, bb.y + bb.height / 2, r, c]);
  if (!top) continue;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(board.x + ((c + 0.5) * board.width) / cols, board.y + ((r + 0.5) * board.height) / rows, { steps: 4 });
  await page.mouse.up();
  placed++;
}
await shot('puzzle-world');
await home();

// Color Splash: fill some regions
await open('creative', 'color-splash');
await tid('cs-template-house').click();
await page.waitForTimeout(500);
const s = await tid('cs-surface').boundingBox();
const fill = async (color, x, y) => {
  await tid(`cs-color-${color}`).click();
  await page.mouse.click(s.x + s.width * x, s.y + s.height * y);
};
await fill('29b6f6', 0.5, 0.05);
await fill('e53935', 0.5, 0.35);
await fill('ffb300', 0.3, 0.7);
await fill('8d6e63', 0.5, 0.75);
await fill('fdd835', 0.85, 0.15);
await fill('43a047', 0.5, 0.95);
await fill('ec407a', 0.1, 0.73);
await shot('color-splash');
await home();

// Maze Escape: a medium maze with a key
await open('adventure', 'maze-escape', 'medium');
await tid('level-m1').click();
await page.locator('[data-testid=maze-canvas] canvas').waitFor();
for (const d of ['right', 'right', 'down']) {
  const b = await tid(`maze-${d}`).boundingBox();
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.up();
  await page.waitForTimeout(200);
}
await shot('maze-escape');
await home();

// Math Battle: two-player race in the Party Arena
await tid('island-party').click();
await tid('game-card-math-battle').click();
await tid('player2-name').fill('Omar');
await tid('lobby-play').click();
await tid('math-start').click();
for (let i = 0; i < 3; i++) {
  const expr = await page.locator('.math-expr').textContent();
  const e = expr.replace('= ?', '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const m = e.match(/(\d+) \+ \? = (\d+)/);
  const ans = m ? String(+m[2] - +m[1]) : String(Function(`return (${e})`)());
  await page.locator(`[data-testid=math-choice][data-value="${ans}"]`).click();
  await page.waitForTimeout(1100);
}
await shot('math-battle');
await home();

// Mini Chef: half-built order
await open('cooking', 'mini-chef', 'easy');
await tid('level-chef-1').click();
await page.waitForTimeout(700);
const rid = await tid('chef-order').getAttribute('data-recipe');
const r = recipes.find((x) => x.id === rid);
for (const st of r.steps.slice(0, 2)) await tid(`chef-ing-${st.id}`).click();
await shot('mini-chef');

await browser.close();
