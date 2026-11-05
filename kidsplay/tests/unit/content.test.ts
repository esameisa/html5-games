// @vitest-environment node
// Runs in Node: real Blob/Response/crypto, like a browser WebView, without jsdom shims.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { installGames } from '../../src/games';
import { collectAssetRefs, isSafeRelativePath, isSafeSvg, validateManifest, validateRemoteIndex } from '../../src/core/content-packs/schema';
import { compareSemver } from '../../src/core/content-packs/semver';
import { sha256Hex } from '../../src/core/content-packs/hash';
import { ContentInstaller, isAllowedSource, joinUrl, uninstallPack } from '../../src/core/content-packs/installer';
import { ContentLibrary } from '../../src/core/content-packs/library';
import { db, resetDatabase } from '../../src/core/storage/db';
import { progress } from '../../src/core/storage/repositories';

installGames();
const site = resolve(__dirname, '../../public/content');
const BASE = 'https://content.example.com/kidsplay';

/** Serves the built static content site from disk, like a CDN would. */
function diskFetcher(overrides: Record<string, () => Response> = {}, log: string[] = []) {
  return async (url: string) => {
    log.push(url);
    const rel = url.replace(BASE + '/', '');
    if (overrides[rel]) return overrides[rel]();
    try {
      const buf = readFileSync(join(site, rel));
      return new Response(buf, { status: 200 });
    } catch {
      return new Response('not found', { status: 404 });
    }
  };
}

const baseManifest = () => ({
  schemaVersion: 1,
  id: 'animals-pack-01',
  version: '1.0.0',
  type: 'memory_cards',
  minAppVersion: '1.0.0',
  title: { en: 'Animal Friends', ar: 'أصدقاء الحيوانات' },
  languages: ['en', 'ar'],
  assets: [] as unknown[],
  levels: [{ id: 'a', title: { en: 'A' }, icon: '🐶', color: '#fff', cards: [{ id: '1', emoji: '🐶' }, { id: '2', emoji: '🐱' }, { id: '3', emoji: '🐭' }] }],
  sizeBytes: 0,
});

describe('content pack schema', () => {
  it('accepts a valid manifest', () => {
    expect(validateManifest(baseManifest()).errors).toEqual([]);
  });

  it('rejects incompatible, malformed or unsafe manifests', () => {
    expect(validateManifest({ ...baseManifest(), minAppVersion: '2.0.0' }).errors.join()).toMatch(/requires app/);
    expect(validateManifest({ ...baseManifest(), type: 'executable_game' }).errors.join()).toMatch(/unknown content type/);
    expect(validateManifest({ ...baseManifest(), schemaVersion: 99 }).ok).toBe(false);
    expect(validateManifest({ ...baseManifest(), id: '../evil' }).ok).toBe(false);
    expect(validateManifest({ ...baseManifest(), levels: [{ id: 'a', cards: [] }] }).ok).toBe(false);
    const js = { ...baseManifest(), assets: [{ path: 'game.js', sha256: 'a'.repeat(64), size: 1, mime: 'application/javascript' }] };
    expect(validateManifest(js).errors.join()).toMatch(/unsafe path|mime not allowed/);
    const undeclared = baseManifest();
    (undeclared.levels[0].cards[0] as Record<string, string>).image = 'img/x.png';
    expect(validateManifest(undeclared).errors.join()).toMatch(/undeclared asset/);
  });

  it('screens paths and SVG content', () => {
    expect(isSafeRelativePath('images/a.svg')).toBe(true);
    for (const bad of ['/etc/passwd', '../x.png', 'https://x/y.png', 'a\\b.png', 'x.html', 'run.js']) expect(isSafeRelativePath(bad)).toBe(false);
    expect(isSafeSvg('<svg><rect/></svg>')).toBe(true);
    expect(isSafeSvg('<svg><script>alert(1)</script></svg>')).toBe(false);
    expect(isSafeSvg('<svg onload="x()"></svg>')).toBe(false);
    expect(isSafeSvg('<svg><a href="javascript:x"></a></svg>')).toBe(false);
    expect(collectAssetRefs({ levels: [{ image: 'a.png', cards: [{ asset: 'b.png' }], previewAsset: 'c.png' }] })).toEqual(['a.png', 'b.png', 'c.png']);
  });

  it('compares versions and computes hashes', async () => {
    expect(compareSemver('1.2.0', '1.10.0')).toBe(-1);
    expect(compareSemver('2.0.0', '1.99.99')).toBe(1);
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('only allows HTTPS sources (plus localhost for development)', () => {
    expect(isAllowedSource('https://cdn.example.com/packs')).toBe(true);
    expect(isAllowedSource('http://cdn.example.com/packs')).toBe(false);
    expect(isAllowedSource('http://localhost:5173/content')).toBe(true);
    expect(joinUrl('https://a.b/c/', './index.json')).toBe('https://a.b/c/index.json');
  });

  it('the built static site and every bundled pack validate', () => {
    const index = JSON.parse(readFileSync(join(site, 'index.json'), 'utf8'));
    expect(validateRemoteIndex(index).errors).toEqual([]);
    for (const e of index.packs) {
      const m = JSON.parse(readFileSync(join(site, e.manifestUrl), 'utf8'));
      const r = validateManifest(m, '99.0.0');
      expect(r.errors).toEqual([]);
    }
  });
});

describe('content installer', () => {
  let library: ContentLibrary;
  beforeEach(async () => {
    await resetDatabase();
    library = new ContentLibrary();
  });

  it('checks the remote index and reports state per pack', async () => {
    const inst = new ContentInstaller(BASE, diskFetcher(), library);
    const list = await inst.checkRemote();
    const byId = Object.fromEntries(list.map((p) => [p.entry.id, p.state]));
    expect(byId['farm-friends']).toBe('not_installed');
    expect(byId['future-pack']).toBe('incompatible');
  });

  it('downloads, verifies, stores and activates a pack with assets; works offline afterwards', async () => {
    const log: string[] = [];
    const inst = new ContentInstaller(BASE, diskFetcher({}, log), library);
    const entry = (await inst.checkRemote()).find((p) => p.entry.id === 'ocean-puzzles')!.entry;
    const progressSteps: number[] = [];
    await inst.install(entry, (p) => progressSteps.push(p));
    expect(progressSteps.at(-1)).toBe(1);
    expect(log.some((u) => u.endsWith('images/whale.svg'))).toBe(true);
    const items = library.items<{ image: string }>('puzzle_images');
    expect(items.map((i) => i.id).sort()).toEqual(['ocean-crab', 'ocean-whale']);
    expect(await db.packAssets.where('packId').equals('ocean-puzzles').count()).toBe(2);
    expect((await inst.checkRemote()).find((p) => p.entry.id === 'ocean-puzzles')!.state).toBe('installed');

    // Offline: a fresh library loads everything from IndexedDB without network.
    const offline = new ContentLibrary();
    await offline.loadInstalled();
    expect(offline.items('puzzle_images')).toHaveLength(2);
  });

  it('rejects tampered assets and keeps the previous version active (rollback)', async () => {
    const good = new ContentInstaller(BASE, diskFetcher(), library);
    const entry = (await good.checkRemote()).find((p) => p.entry.id === 'ocean-puzzles')!.entry;
    await good.install(entry);

    const manifestPath = entry.manifestUrl;
    const manifest = JSON.parse(readFileSync(join(site, manifestPath), 'utf8'));
    const v2 = { ...manifest, version: '2.0.0' };
    const v2Text = JSON.stringify(v2);
    const v2Entry = { ...entry, version: '2.0.0', manifestSha256: await sha256Hex(v2Text) };
    const evil = new ContentInstaller(
      BASE,
      diskFetcher({
        [manifestPath]: () => new Response(v2Text),
        'packs/ocean-puzzles/images/crab.svg': () => new Response('<svg>tampered</svg>'),
      }),
      library,
    );
    await expect(evil.install(v2Entry)).rejects.toThrow(/mismatch/);
    const row = await db.packs.get('ocean-puzzles');
    expect(row?.version).toBe(manifest.version);
    expect(await db.packAssets.where('packId').equals('ocean-puzzles').filter((a) => a.version === '2.0.0').count()).toBe(0);
    expect(library.items('puzzle_images')).toHaveLength(2);
  });

  it('rejects a manifest whose hash does not match the index', async () => {
    const inst = new ContentInstaller(BASE, diskFetcher(), library);
    const entry = (await inst.checkRemote()).find((p) => p.entry.id === 'farm-friends')!.entry;
    await expect(inst.install({ ...entry, manifestSha256: 'f'.repeat(64) })).rejects.toThrow(/hash mismatch/i);
    expect(await db.packs.count()).toBe(0);
  });

  it('reports network failures without touching installed data', async () => {
    const inst = new ContentInstaller(BASE, async () => Promise.reject(new TypeError('Failed to fetch')), library);
    await expect(inst.checkRemote()).rejects.toThrow(/Network error/);
  });

  it('installing or removing packs never changes saved game progress', async () => {
    await progress.recordLevel({ gameId: 'memory-cards', profileId: 'kid', levelId: 'animals:easy', score: 1, stars: 3, completed: true, durationSeconds: 1, playedAt: 'x', mode: 'solo', difficulty: 'easy' });
    const inst = new ContentInstaller(BASE, diskFetcher(), library);
    const entry = (await inst.checkRemote()).find((p) => p.entry.id === 'farm-friends')!.entry;
    await inst.install(entry);
    expect(library.items('memory_cards').map((i) => i.id)).toContain('farm');
    await uninstallPack('farm-friends', library);
    expect(library.items('memory_cards')).toHaveLength(0);
    expect((await progress.get('kid', 'memory-cards')).levels['animals:easy'].stars).toBe(3);
  });

  it('bundled packs are always available and cannot be shadowed by downloads', () => {
    const lib = new ContentLibrary();
    lib.registerBundled(baseManifest());
    expect(lib.items('memory_cards')[0]).toMatchObject({ id: 'a', packId: 'animals-pack-01', bundled: true });
    expect(lib.assetUrl('animals-pack-01', 'x.png')).toBe('./x.png');
  });
});
