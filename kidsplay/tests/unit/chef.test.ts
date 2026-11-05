import { describe, expect, it } from 'vitest';
import pack from '../../src/games/mini-chef/recipes.json';
import levels from '../../src/games/mini-chef/levels.json';
import { buildShelf, chefStars, isNextStep, makeOrders, newRecipesAt, recipesForLevel, validateAssembly, validateRecipe, type Recipe } from '../../src/games/mini-chef/chef';
import { createRng } from '../../src/shared/utils/random';

const recipes = pack.levels as Recipe[];
const burger = recipes.find((r) => r.id === 'burger')!;

describe('mini chef recipes', () => {
  it('bundles the six required recipes and all are valid', () => {
    expect(recipes.map((r) => r.id).sort()).toEqual(['burger', 'fruit-salad', 'ice-cream', 'pancakes', 'pizza', 'sandwich']);
    for (const r of recipes) expect(validateRecipe(r as unknown as Record<string, unknown>, 0)).toEqual([]);
  });

  it('validates assembly order', () => {
    const ids = burger.steps.map((s) => s.id);
    expect(validateAssembly(burger, []).status).toBe('partial');
    expect(validateAssembly(burger, ids.slice(0, 3))).toMatchObject({ status: 'partial', next: burger.steps[3] });
    expect(validateAssembly(burger, ids).status).toBe('complete');
    expect(validateAssembly(burger, [ids[1], ids[0]])).toMatchObject({ status: 'wrong', index: 0 });
    expect(validateAssembly(burger, [...ids, 'cheese']).status).toBe('wrong');
    expect(isNextStep(burger, [], 'bun-bottom')).toBe(true);
    expect(isNextStep(burger, [], 'bun-top')).toBe(false);
  });

  it('unlocks recipes progressively and every level has dishes', () => {
    expect(recipesForLevel(recipes, 1).length).toBeGreaterThan(0);
    expect(recipesForLevel(recipes, 12)).toHaveLength(recipes.length);
    for (const l of levels.levels) expect(recipesForLevel(recipes, l.number).length).toBeGreaterThan(0);
    expect(newRecipesAt(recipes, 8).map((r) => r.id)).toContain('burger');
  });

  it('shelf always contains every needed ingredient', () => {
    const rng = createRng(11);
    for (const l of levels.levels) {
      const today = recipesForLevel(recipes, l.number);
      const shelf = buildShelf(rng, today, recipes, l.extraIngredients);
      const ids = new Set(shelf.map((s) => s.id));
      for (const r of today) for (const s of r.steps) expect(ids.has(s.id)).toBe(true);
      const orders = makeOrders(rng, today, l.customers);
      expect(orders).toHaveLength(l.customers);
      for (const o of orders) expect(today).toContain(o);
    }
  });

  it('awards stars by mistakes', () => {
    expect(chefStars(0, 0)).toBe(3);
    expect(chefStars(2, 0)).toBe(2);
    expect(chefStars(0, 2)).toBe(1);
  });

  it('rejects malformed recipe packs', () => {
    expect(validateRecipe({ id: 'x', emoji: '🍩', name: { en: 'Donut' }, unlockLevel: 1, steps: [] }, 0).length).toBeGreaterThan(0);
    expect(validateRecipe({ id: 'x', name: { en: 'Donut' }, unlockLevel: 0, steps: [{ id: 'a' }] }, 0).length).toBeGreaterThan(2);
  });
});
