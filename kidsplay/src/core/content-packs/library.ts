import { db } from '../storage/db';
import { validateManifest, type ContentManifest } from './schema';
import type { ContentService } from '../game-engine/types';

/** Every content item exposed to games carries the id of the pack it came from. */
export type ContentItem<T = Record<string, unknown>> = T & { id: string; packId: string; bundled: boolean };

interface LoadedPack {
  manifest: ContentManifest;
  bundled: boolean;
  /** For bundled packs: base URL of assets. For installed packs: object URLs per path. */
  assetUrls: Map<string, string>;
  baseUrl?: string;
}

/**
 * In-memory view of all *active* content: bundled packs (shipped with the app and always
 * available offline) plus installed downloadable packs (loaded from IndexedDB).
 */
export class ContentLibrary implements ContentService {
  private packs = new Map<string, LoadedPack>();
  private listeners = new Set<() => void>();

  /** Register a pack that is bundled in the application. Validated like remote packs. */
  registerBundled(manifest: unknown, baseUrl = './'): void {
    const res = validateManifest(manifest, { bundled: true });
    if (!res.ok || !res.value) throw new Error(`Bundled pack invalid: ${res.errors.join('; ')}`);
    this.packs.set(res.value.id, { manifest: res.value, bundled: true, assetUrls: new Map(), baseUrl });
    this.emit();
  }

  /** Load all active installed packs from IndexedDB. Invalid rows are skipped, not fatal. */
  async loadInstalled(): Promise<void> {
    for (const [id, p] of this.packs) if (!p.bundled) this.unload(id);
    const rows = await db.packs.where('status').equals('active').toArray();
    for (const row of rows) {
      const res = validateManifest(row.manifest);
      if (!res.ok || !res.value) {
        console.warn(`[content] skipping invalid installed pack ${row.id}`, res.errors);
        continue;
      }
      if (this.packs.get(row.id)?.bundled) continue; // never shadow bundled content
      const assets = await db.packAssets.where('packId').equals(row.id).filter((a) => a.version === row.version).toArray();
      const urls = new Map<string, string>();
      for (const a of assets) urls.set(a.path, URL.createObjectURL(a.blob));
      this.packs.set(row.id, { manifest: res.value, bundled: false, assetUrls: urls });
    }
    this.emit();
  }

  unload(id: string): void {
    const p = this.packs.get(id);
    if (!p || p.bundled) return;
    for (const url of p.assetUrls.values()) URL.revokeObjectURL(url);
    this.packs.delete(id);
    this.emit();
  }

  items<T = Record<string, unknown>>(type: string): ContentItem<T>[] {
    const out: ContentItem<T>[] = [];
    for (const p of this.packs.values()) {
      if (p.manifest.type !== type) continue;
      for (const lvl of p.manifest.levels) {
        out.push({ ...(lvl as T), id: String(lvl.id), packId: p.manifest.id, bundled: p.bundled });
      }
    }
    return out;
  }

  packsOfType(type: string): { manifest: ContentManifest; bundled: boolean }[] {
    return [...this.packs.values()].filter((p) => p.manifest.type === type).map(({ manifest, bundled }) => ({ manifest, bundled }));
  }

  allPacks(): { manifest: ContentManifest; bundled: boolean }[] {
    return [...this.packs.values()].map(({ manifest, bundled }) => ({ manifest, bundled }));
  }

  assetUrl(packId: string | undefined, path: string): string {
    const p = packId ? this.packs.get(packId) : undefined;
    if (!p) return path;
    if (p.bundled) return (p.baseUrl ?? './') + path;
    return p.assetUrls.get(path) ?? '';
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const contentLibrary = new ContentLibrary();
