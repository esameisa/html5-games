import type { LevelValidator } from '../../core/content-packs/schema';
import { pick, shuffle, type Rng } from '../../shared/utils/random';

export const RECIPE_CONTENT_TYPE = 'recipes';

export interface Ingredient {
  id: string;
  emoji: string;
  name: Record<string, string>;
}

export interface Recipe {
  id: string;
  packId?: string;
  emoji: string;
  name: Record<string, string>;
  unlockLevel: number;
  steps: Ingredient[];
}

export interface ChefLevel {
  id: string;
  number: number;
  customers: number;
  extraIngredients: number;
}

export type AssemblyStatus = { status: 'complete' } | { status: 'partial'; next: Ingredient } | { status: 'wrong'; index: number; expected: Ingredient | null };

/** Validate the plate against a recipe: ingredients must be added in the exact order. */
export function validateAssembly(recipe: Recipe, plate: string[]): AssemblyStatus {
  for (let i = 0; i < plate.length; i++) {
    if (i >= recipe.steps.length || plate[i] !== recipe.steps[i].id) return { status: 'wrong', index: i, expected: recipe.steps[i] ?? null };
  }
  if (plate.length === recipe.steps.length) return { status: 'complete' };
  return { status: 'partial', next: recipe.steps[plate.length] };
}

/** Would adding `ingredientId` keep the plate on track? */
export function isNextStep(recipe: Recipe, plate: string[], ingredientId: string): boolean {
  return validateAssembly(recipe, [...plate, ingredientId]).status !== 'wrong';
}

export function recipesForLevel(all: Recipe[], level: number): Recipe[] {
  return all.filter((r) => r.unlockLevel <= level);
}

export function newRecipesAt(all: Recipe[], level: number): Recipe[] {
  return all.filter((r) => r.unlockLevel === level);
}

/** Shelf = every ingredient needed by today's recipes plus a few distractors (older kids). */
export function buildShelf(rng: Rng, recipes: Recipe[], all: Recipe[], extra: number): Ingredient[] {
  const map = new Map<string, Ingredient>();
  for (const r of recipes) for (const s of r.steps) map.set(s.id, s);
  const others = shuffle(
    rng,
    all.flatMap((r) => r.steps).filter((s) => !map.has(s.id)),
  );
  for (const o of others) {
    if (extra <= 0) break;
    if (!map.has(o.id)) {
      map.set(o.id, o);
      extra--;
    }
  }
  return shuffle(rng, [...map.values()]);
}

export function makeOrders(rng: Rng, recipes: Recipe[], count: number): Recipe[] {
  const out: Recipe[] = [];
  for (let i = 0; i < count; i++) {
    let r = pick(rng, recipes);
    if (recipes.length > 1 && out.length && out[out.length - 1].id === r.id) r = pick(rng, recipes);
    out.push(r);
  }
  return out;
}

export function chefStars(mistakes: number, timeouts: number): number {
  const m = mistakes + timeouts * 2;
  return m === 0 ? 3 : m <= 2 ? 2 : 1;
}

export const validateRecipe: LevelValidator = (lvl) => {
  const e: string[] = [];
  if (typeof lvl.emoji !== 'string') e.push('missing emoji');
  if (typeof lvl.name !== 'object' || lvl.name === null) e.push('missing name');
  if (typeof lvl.unlockLevel !== 'number' || lvl.unlockLevel < 1) e.push('unlockLevel must be >= 1');
  if (!Array.isArray(lvl.steps) || lvl.steps.length < 2 || lvl.steps.length > 8) e.push('steps must have 2–8 ingredients');
  else
    (lvl.steps as Record<string, unknown>[]).forEach((s, i) => {
      if (typeof s?.id !== 'string' || typeof s?.emoji !== 'string') e.push(`step ${i} needs id and emoji`);
      if (typeof s?.name !== 'object') e.push(`step ${i} needs a name`);
    });
  return e;
};
