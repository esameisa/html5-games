import { APP_VERSION, CONTENT_SCHEMA_VERSION } from '../../app/version';
import { compareSemver, isSemver } from './semver';

/**
 * Content packs are *declarative data + media only*. No executable code is ever
 * downloaded: assets are restricted to images/audio/JSON and SVGs are screened for
 * scripts. New game mechanics ship through reviewed app updates.
 */
export interface PackAssetDef {
  path: string;
  sha256: string;
  size: number;
  mime: string;
}

export interface ContentManifest {
  schemaVersion: number;
  id: string;
  version: string;
  type: string;
  minAppVersion: string;
  maxAppVersion?: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  languages: string[];
  assets: PackAssetDef[];
  levels: Record<string, unknown>[];
  sizeBytes: number;
}

export interface RemoteIndexEntry {
  id: string;
  version: string;
  type: string;
  title: Record<string, string>;
  manifestUrl: string;
  manifestSha256: string;
  sizeBytes: number;
  minAppVersion: string;
}

export interface RemoteIndex {
  schemaVersion: number;
  generatedAt?: string;
  packs: RemoteIndexEntry[];
}

export const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'audio/mpeg',
  'audio/ogg',
  'application/json',
]);

const FORBIDDEN_EXT = /\.(m?js|cjs|ts|html?|wasm|exe|sh|php)$/i;
const ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;
const MAX_PACK_BYTES = 25 * 1024 * 1024;

export type LevelValidator = (level: Record<string, unknown>, index: number) => string[];
const levelValidators = new Map<string, LevelValidator>();

/** Each game registers a validator for the content type it consumes. */
export function registerContentType(type: string, validator: LevelValidator): void {
  levelValidators.set(type, validator);
}

export function knownContentTypes(): string[] {
  return [...levelValidators.keys()];
}

export interface ValidationResult<T> {
  ok: boolean;
  errors: string[];
  value?: T;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isLocalized(v: unknown): v is Record<string, string> {
  return isObj(v) && typeof v.en === 'string' && Object.values(v).every((x) => typeof x === 'string');
}

export function isSafeRelativePath(p: unknown): p is string {
  return (
    typeof p === 'string' &&
    p.length > 0 &&
    p.length < 200 &&
    !p.startsWith('/') &&
    !p.includes('..') &&
    !p.includes('\\') &&
    !/^[a-z]+:/i.test(p) &&
    /^[a-zA-Z0-9_\-./]+$/.test(p) &&
    !FORBIDDEN_EXT.test(p)
  );
}

export interface ManifestValidationOptions {
  appVersion?: string;
  /** Bundled packs reference files shipped inside the app, so assets need not be declared. */
  bundled?: boolean;
}

export function validateManifest(input: unknown, opts: ManifestValidationOptions | string = {}): ValidationResult<ContentManifest> {
  const { appVersion = APP_VERSION, bundled = false } = typeof opts === 'string' ? { appVersion: opts } : opts;
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ['manifest must be an object'] };
  const m = input;
  if (m.schemaVersion !== CONTENT_SCHEMA_VERSION) errors.push(`unsupported schemaVersion ${String(m.schemaVersion)}`);
  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) errors.push('invalid id');
  if (!isSemver(m.version)) errors.push('invalid version');
  if (typeof m.type !== 'string' || !levelValidators.has(m.type)) errors.push(`unknown content type ${String(m.type)}`);
  if (!isSemver(m.minAppVersion)) errors.push('invalid minAppVersion');
  else if (compareSemver(appVersion, m.minAppVersion) < 0) errors.push(`requires app ${m.minAppVersion}`);
  if (m.maxAppVersion !== undefined) {
    if (!isSemver(m.maxAppVersion)) errors.push('invalid maxAppVersion');
    else if (compareSemver(appVersion, m.maxAppVersion) > 0) errors.push(`supports app up to ${m.maxAppVersion}`);
  }
  if (!isLocalized(m.title)) errors.push('title must be localized text with "en"');
  if (m.description !== undefined && !isLocalized(m.description)) errors.push('invalid description');
  if (!Array.isArray(m.languages) || !m.languages.every((l) => typeof l === 'string')) errors.push('invalid languages');
  if (typeof m.sizeBytes !== 'number' || m.sizeBytes < 0 || m.sizeBytes > MAX_PACK_BYTES) errors.push('invalid sizeBytes');

  const assetPaths = new Set<string>();
  if (!Array.isArray(m.assets)) errors.push('assets must be an array');
  else {
    m.assets.forEach((a, i) => {
      if (!isObj(a)) return errors.push(`asset[${i}] invalid`);
      if (!isSafeRelativePath(a.path)) errors.push(`asset[${i}] unsafe path`);
      else if (assetPaths.has(a.path)) errors.push(`asset[${i}] duplicate path`);
      else assetPaths.add(a.path);
      if (typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(a.sha256)) errors.push(`asset[${i}] invalid sha256`);
      if (typeof a.size !== 'number' || a.size < 0) errors.push(`asset[${i}] invalid size`);
      if (typeof a.mime !== 'string' || !ALLOWED_MIME.has(a.mime)) errors.push(`asset[${i}] mime not allowed`);
    });
  }

  if (!Array.isArray(m.levels) || m.levels.length === 0) errors.push('levels must be a non-empty array');
  else if (typeof m.type === 'string' && levelValidators.has(m.type)) {
    const validate = levelValidators.get(m.type)!;
    const ids = new Set<string>();
    m.levels.forEach((lvl, i) => {
      if (!isObj(lvl)) return errors.push(`level[${i}] must be an object`);
      if (typeof lvl.id !== 'string' || !lvl.id) errors.push(`level[${i}] missing id`);
      else if (ids.has(lvl.id)) errors.push(`level[${i}] duplicate id ${lvl.id}`);
      else ids.add(lvl.id);
      for (const e of validate(lvl, i)) errors.push(`level[${i}] ${e}`);
      // Any string that looks like an asset reference must be declared in `assets`.
      if (!bundled) for (const ref of collectAssetRefs(lvl)) if (!assetPaths.has(ref)) errors.push(`level[${i}] undeclared asset ${ref}`);
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors, value: m as unknown as ContentManifest };
}

/** Values of keys named `asset`/`image`/`*Asset` are treated as asset references. */
export function collectAssetRefs(obj: unknown, out: string[] = []): string[] {
  if (Array.isArray(obj)) obj.forEach((v) => collectAssetRefs(v, out));
  else if (isObj(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && (k === 'asset' || k === 'image' || k.endsWith('Asset'))) out.push(v);
      else collectAssetRefs(v, out);
    }
  }
  return out;
}

export function validateRemoteIndex(input: unknown): ValidationResult<RemoteIndex> {
  const errors: string[] = [];
  if (!isObj(input) || !Array.isArray(input.packs)) return { ok: false, errors: ['invalid index'] };
  if (input.schemaVersion !== CONTENT_SCHEMA_VERSION) errors.push('unsupported index schemaVersion');
  input.packs.forEach((p, i) => {
    if (!isObj(p)) return errors.push(`packs[${i}] invalid`);
    if (typeof p.id !== 'string' || !ID_RE.test(p.id)) errors.push(`packs[${i}] invalid id`);
    if (!isSemver(p.version)) errors.push(`packs[${i}] invalid version`);
    if (!isSemver(p.minAppVersion)) errors.push(`packs[${i}] invalid minAppVersion`);
    if (typeof p.type !== 'string') errors.push(`packs[${i}] invalid type`);
    if (!isLocalized(p.title)) errors.push(`packs[${i}] invalid title`);
    if (!isSafeRelativePath(p.manifestUrl)) errors.push(`packs[${i}] unsafe manifestUrl`);
    if (typeof p.manifestSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.manifestSha256)) errors.push(`packs[${i}] invalid hash`);
    if (typeof p.sizeBytes !== 'number') errors.push(`packs[${i}] invalid sizeBytes`);
  });
  return errors.length ? { ok: false, errors } : { ok: true, errors, value: input as unknown as RemoteIndex };
}

/** Rejects SVGs that could carry active content (scripts, event handlers, external refs). */
export function isSafeSvg(text: string): boolean {
  const lower = text.toLowerCase();
  return !(
    lower.includes('<script') ||
    lower.includes('<foreignobject') ||
    /\son[a-z]+\s*=/.test(lower) ||
    lower.includes('javascript:') ||
    /(href|src)\s*=\s*["']\s*(https?:|data:text\/html|\/\/)/.test(lower)
  );
}
