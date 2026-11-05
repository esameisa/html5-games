/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Emits `sw.js` with a precache list of every built file so the web build is fully playable
 * offline after the first visit. (Native builds load files from the app bundle and do not
 * need it.) Downloaded content packs live in IndexedDB, not in this cache.
 */
function offlineServiceWorker(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [relative(publicDir, p).split('\\').join('/')];
    });
  return {
    name: 'kidsplay-offline-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      // Remote-content samples (public/content) are deliberately not precached.
      const publicFiles = walk(publicDir).filter((f) => !f.startsWith('content/'));
      const files = ['./', ...Object.keys(bundle).filter((f) => !f.endsWith('.map')), ...publicFiles];
      const version = Date.now().toString(36);
      const source = [
        `const CACHE = 'kidsplay-${version}';`,
        `const PRECACHE = ${JSON.stringify(files)};`,
        SW_RUNTIME,
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

const SW_RUNTIME = `
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/content/')) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) => hit || fetch(e.request).catch(() => caches.match('./')),
    ),
  );
});
`;

export default defineConfig({
  // Relative base so the bundle works from file:// / capacitor:// origins.
  base: './',
  plugins: [react(), offlineServiceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
  },
});
