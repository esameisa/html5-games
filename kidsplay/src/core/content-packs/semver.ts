/** Minimal semantic-version helpers (MAJOR.MINOR.PATCH, no pre-release tags). */
const RE = /^(\d+)\.(\d+)\.(\d+)$/;

export function isSemver(v: unknown): v is string {
  return typeof v === 'string' && RE.test(v);
}

export function compareSemver(a: string, b: string): number {
  const pa = a.match(RE);
  const pb = b.match(RE);
  if (!pa || !pb) throw new Error(`Invalid version: ${!pa ? a : b}`);
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}
