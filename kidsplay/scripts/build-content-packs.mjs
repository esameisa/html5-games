#!/usr/bin/env node
/**
 * Builds the static content-pack site from content-packs/src/<pack>/.
 *
 * For every pack it collects asset files, computes size + SHA-256 for each, writes the final
 * manifest (with `assets` and `sizeBytes`), then writes `index.json` with the manifest hash.
 * Output goes to `public/content/` (served at ./content for local testing) and can be uploaded
 * unchanged to any HTTPS static host (S3, GitHub Pages, Netlify…).
 *
 * Usage: node scripts/build-content-packs.mjs [outDir]
 */
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const srcDir = join(root, 'content-packs', 'src');
const outDir = resolve(process.argv[2] ?? join(root, 'public', 'content'));
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.json': 'application/json' };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'packs'), { recursive: true });
const index = { schemaVersion: 1, generatedAt: new Date().toISOString(), packs: [] };

for (const id of readdirSync(srcDir).sort()) {
  const dir = join(srcDir, id);
  const pack = JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8'));
  if (pack.id !== id) throw new Error(`Folder ${id} does not match pack id ${pack.id}`);
  const files = walk(dir).filter((f) => !f.endsWith('pack.json'));
  const assets = files.map((f) => {
    const ext = extname(f).toLowerCase();
    if (!MIME[ext]) throw new Error(`Unsupported asset type ${f} (only images/audio/json are allowed)`);
    const buf = readFileSync(f);
    if (ext === '.svg' && /<script|on[a-z]+\s*=|javascript:|<foreignObject/i.test(buf.toString())) throw new Error(`Unsafe SVG ${f}`);
    return { path: relative(dir, f).split('\\').join('/'), sha256: sha(buf), size: buf.length, mime: MIME[ext] };
  });
  const manifest = { ...pack, assets, sizeBytes: assets.reduce((s, a) => s + a.size, 0) };
  const manifestText = JSON.stringify(manifest, null, 1);
  const packOut = join(outDir, 'packs', id);
  mkdirSync(packOut, { recursive: true });
  for (const f of files) {
    const dst = join(packOut, relative(dir, f));
    mkdirSync(resolve(dst, '..'), { recursive: true });
    cpSync(f, dst);
  }
  writeFileSync(join(packOut, 'manifest.json'), manifestText);
  index.packs.push({
    id,
    version: pack.version,
    type: pack.type,
    title: pack.title,
    minAppVersion: pack.minAppVersion,
    manifestUrl: `packs/${id}/manifest.json`,
    manifestSha256: sha(Buffer.from(manifestText)),
    sizeBytes: manifest.sizeBytes + Buffer.byteLength(manifestText),
  });
}
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 1));
console.log(`Built ${index.packs.length} content packs into ${relative(root, outDir) || outDir}`);
