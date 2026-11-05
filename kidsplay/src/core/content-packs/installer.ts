import { db, isQuotaError, type InstalledPack, type PackAsset } from '../storage/db';
import { sha256Hex } from './hash';
import { compareSemver } from './semver';
import {
  isSafeSvg,
  validateManifest,
  validateRemoteIndex,
  type ContentManifest,
  type RemoteIndex,
  type RemoteIndexEntry,
} from './schema';
import { APP_VERSION } from '../../app/version';
import { contentLibrary, type ContentLibrary } from './library';

export type Fetcher = (url: string) => Promise<Response>;

export type PackState = 'not_installed' | 'installed' | 'update_available' | 'incompatible';

export interface AvailablePack {
  entry: RemoteIndexEntry;
  state: PackState;
  installedVersion?: string;
}

export class InstallError extends Error {
  constructor(
    message: string,
    readonly stage: 'network' | 'integrity' | 'validation' | 'storage',
  ) {
    super(message);
  }
}

export function joinUrl(base: string, rel: string): string {
  return base.replace(/\/+$/, '') + '/' + rel.replace(/^\.?\/+/, '');
}

/** Only HTTPS sources are accepted in production; http://localhost is allowed for development. */
export function isAllowedSource(url: string): boolean {
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.href : 'https://localhost/');
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export class ContentInstaller {
  constructor(
    private baseUrl: string,
    private fetcher: Fetcher = (u) => fetch(u, { cache: 'no-cache', credentials: 'omit' }),
    private library: ContentLibrary = contentLibrary,
    private appVersion = APP_VERSION,
  ) {}

  private async fetchOk(url: string): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetcher(url);
    } catch (e) {
      throw new InstallError(`Network error: ${(e as Error).message}`, 'network');
    }
    if (!res.ok) throw new InstallError(`HTTP ${res.status} for ${url}`, 'network');
    return res;
  }

  /** 1) Check the remote index. 2) Compare with installed versions. */
  async checkRemote(): Promise<AvailablePack[]> {
    if (!isAllowedSource(this.baseUrl)) throw new InstallError('Content source must use HTTPS', 'validation');
    const res = await this.fetchOk(joinUrl(this.baseUrl, 'index.json'));
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new InstallError('Index is not valid JSON', 'validation');
    }
    const idx = validateRemoteIndex(json);
    if (!idx.ok || !idx.value) throw new InstallError(idx.errors.join('; '), 'validation');
    return this.compare(idx.value);
  }

  async compare(index: RemoteIndex): Promise<AvailablePack[]> {
    const installed = new Map((await db.packs.toArray()).filter((p) => p.status === 'active').map((p) => [p.id, p]));
    return index.packs.map((entry) => {
      const inst = installed.get(entry.id);
      if (compareSemver(this.appVersion, entry.minAppVersion) < 0) return { entry, state: 'incompatible', installedVersion: inst?.version };
      if (!inst) return { entry, state: 'not_installed' };
      return {
        entry,
        state: compareSemver(entry.version, inst.version) > 0 ? 'update_available' : 'installed',
        installedVersion: inst.version,
      };
    });
  }

  /**
   * 3–8) Download, validate and verify, stage locally, then atomically activate.
   * On any failure staged data is removed and the previously active version is kept.
   */
  async install(entry: RemoteIndexEntry, onProgress?: (ratio: number) => void): Promise<ContentManifest> {
    const manifestUrl = joinUrl(this.baseUrl, entry.manifestUrl);
    const packBase = manifestUrl.slice(0, manifestUrl.lastIndexOf('/'));
    const raw = await (await this.fetchOk(manifestUrl)).arrayBuffer();
    if ((await sha256Hex(raw)) !== entry.manifestSha256) throw new InstallError('Manifest hash mismatch', 'integrity');

    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      throw new InstallError('Manifest is not valid JSON', 'validation');
    }
    const res = validateManifest(json, this.appVersion);
    if (!res.ok || !res.value) throw new InstallError(res.errors.join('; '), 'validation');
    const manifest = res.value;
    if (manifest.id !== entry.id || manifest.version !== entry.version) {
      throw new InstallError('Manifest does not match index entry', 'integrity');
    }

    const assets: PackAsset[] = [];
    let done = 0;
    for (const a of manifest.assets) {
      const buf = await (await this.fetchOk(joinUrl(packBase, a.path))).arrayBuffer();
      if (buf.byteLength !== a.size) throw new InstallError(`Size mismatch for ${a.path}`, 'integrity');
      if ((await sha256Hex(buf)) !== a.sha256) throw new InstallError(`Hash mismatch for ${a.path}`, 'integrity');
      if (a.mime === 'image/svg+xml' && !isSafeSvg(new TextDecoder().decode(buf))) {
        throw new InstallError(`Unsafe SVG ${a.path}`, 'validation');
      }
      assets.push({
        key: `${manifest.id}@${manifest.version}:${a.path}`,
        packId: manifest.id,
        version: manifest.version,
        path: a.path,
        mime: a.mime,
        blob: new Blob([buf], { type: a.mime }),
      });
      onProgress?.(++done / Math.max(1, manifest.assets.length));
    }
    if (manifest.assets.length === 0) onProgress?.(1);

    // Stage: write assets for the new version (old version untouched and still active).
    try {
      await db.packAssets.bulkPut(assets);
    } catch (e) {
      await this.discardVersion(manifest.id, manifest.version);
      throw new InstallError(isQuotaError(e) ? 'Not enough storage space' : String(e), 'storage');
    }

    // Activate atomically: swap the pack row and drop the previous version's assets.
    try {
      await db.transaction('rw', db.packs, db.packAssets, async () => {
        const prev = await db.packs.get(manifest.id);
        const row: InstalledPack = {
          id: manifest.id,
          version: manifest.version,
          type: manifest.type,
          status: 'active',
          installedAt: new Date().toISOString(),
          sizeBytes: manifest.sizeBytes,
          manifest,
          previousVersion: prev?.version,
        };
        await db.packs.put(row);
        if (prev && prev.version !== manifest.version) {
          await db.packAssets.where('packId').equals(manifest.id).filter((a) => a.version === prev.version).delete();
        }
      });
    } catch (e) {
      await this.discardVersion(manifest.id, manifest.version);
      throw new InstallError(`Activation failed: ${String(e)}`, 'storage');
    }
    await this.library.loadInstalled();
    return manifest;
  }

  /** Rollback helper: delete assets of a (failed) staged version unless it is the active one. */
  private async discardVersion(packId: string, version: string): Promise<void> {
    const active = await db.packs.get(packId);
    if (active?.version === version && active.status === 'active') return;
    await db.packAssets.where('packId').equals(packId).filter((a) => a.version === version).delete();
  }
}

/** Remove an installed pack. Game progress is stored separately and is never touched. */
export async function uninstallPack(packId: string, library: ContentLibrary = contentLibrary): Promise<void> {
  await db.transaction('rw', db.packs, db.packAssets, async () => {
    await db.packs.delete(packId);
    await db.packAssets.where('packId').equals(packId).delete();
  });
  library.unload(packId);
}

export async function listInstalledPacks(): Promise<InstalledPack[]> {
  return db.packs.toArray();
}
