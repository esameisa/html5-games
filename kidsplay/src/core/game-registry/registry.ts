import type { AgeGroup, GameManifest, WorldAreaId } from '../game-engine/types';

const AGE_RANGES: Record<AgeGroup, [number, number]> = {
  '4-6': [4, 6],
  '7-9': [7, 9],
  '10-12': [10, 12],
};

export function ageRange(group: AgeGroup): [number, number] {
  return AGE_RANGES[group];
}

/** Central registry. Games register static manifests; code is loaded lazily on demand. */
export class GameRegistry {
  private games = new Map<string, GameManifest>();

  register(manifest: GameManifest): void {
    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error(`Invalid game id "${manifest.id}"`);
    }
    if (this.games.has(manifest.id)) {
      throw new Error(`Game "${manifest.id}" is already registered`);
    }
    if (manifest.minAge > manifest.maxAge) {
      throw new Error(`Game "${manifest.id}" has an invalid age range`);
    }
    if (manifest.difficulties.length === 0) {
      throw new Error(`Game "${manifest.id}" must declare at least one difficulty`);
    }
    this.games.set(manifest.id, manifest);
  }

  unregister(id: string): void {
    this.games.delete(id);
  }

  get(id: string): GameManifest | undefined {
    return this.games.get(id);
  }

  all(): GameManifest[] {
    return [...this.games.values()];
  }

  byArea(area: WorldAreaId): GameManifest[] {
    if (area === 'party') return this.all().filter((g) => g.supportsVersus);
    return this.all().filter((g) => g.area === area);
  }

  /** Games whose age range overlaps the given age group. */
  forAgeGroup(group: AgeGroup): GameManifest[] {
    const [lo, hi] = AGE_RANGES[group];
    return this.all().filter((g) => g.minAge <= hi && g.maxAge >= lo);
  }

  isSuitable(id: string, group: AgeGroup): boolean {
    const g = this.games.get(id);
    if (!g) return false;
    const [lo, hi] = AGE_RANGES[group];
    return g.minAge <= hi && g.maxAge >= lo;
  }
}
