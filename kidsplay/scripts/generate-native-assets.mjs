#!/usr/bin/env node
/**
 * Rasterizes the original vector artwork (public/icon.svg) into the Android/iOS launcher
 * icons and splash screens. Uses the Playwright Chromium already used for E2E tests.
 * Usage: node scripts/generate-native-assets.mjs
 */
import { chromium } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const icon = readFileSync(join(root, 'public/icon.svg'), 'utf8');
const inner = icon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -120 752 752">${inner.replace(/<rect width="512" height="512" rx="110" fill="url\(#g\)"\/>/, '')}</svg>`;

const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
async function render(html, w, h, out, transparent = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;${transparent ? '' : 'background:#7ec8ff'}">${html}</body></html>`);
  await page.screenshot({ path: out, omitBackground: transparent });
}
const svgBox = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" style="display:block" `);
const splash = (w, h) => {
  const s = Math.min(w, h) * 0.32;
  return `<div style="width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#fff7b8,#7ec8ff 65%);font-family:'Trebuchet MS',sans-serif">
    ${svgBox(foreground, s * 1.2, s * 1.2)}
    <div style="font-size:${s * 0.38}px;font-weight:900;color:#fff;text-shadow:0 ${s * 0.03}px 0 #e85d3c">KidsPlay</div></div>`;
};

const res = join(root, 'android/app/src/main/res');
let count = 0;
if (existsSync(res)) {
  for (const dir of readdirSync(res)) {
    const d = join(res, dir);
    for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'splash.png']) {
      const file = join(d, f);
      if (!existsSync(file)) continue;
      const [w, h] = pngSize(file);
      if (f === 'splash.png') await render(splash(w, h), w, h, file);
      else if (f === 'ic_launcher_foreground.png') await render(svgBox(foreground, w, h), w, h, file, true);
      else if (f === 'ic_launcher_round.png') await render(`<div style="width:${w}px;height:${h}px;border-radius:50%;overflow:hidden">${svgBox(icon, w, h)}</div>`, w, h, file, true);
      else await render(svgBox(icon, w, h), w, h, file, true);
      count++;
    }
  }
}
const ios = join(root, 'ios/App/App/Assets.xcassets');
if (existsSync(ios)) {
  await render(svgBox(icon.replace('rx="110"', 'rx="0"'), 1024, 1024), 1024, 1024, join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'));
  count++;
  for (const f of readdirSync(join(ios, 'Splash.imageset')).filter((x) => x.endsWith('.png'))) {
    await render(splash(2732, 2732), 2732, 2732, join(ios, 'Splash.imageset', f));
    count++;
  }
}
await browser.close();
console.log(`Generated ${count} native icon/splash images`);
