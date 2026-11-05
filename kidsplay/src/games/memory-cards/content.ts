import type { LevelValidator } from '../../core/content-packs/schema';

export const MEMORY_CONTENT_TYPE = 'memory_cards';

export interface CardSet {
  id: string;
  packId: string;
  title: Record<string, string>;
  icon: string;
  color: string;
  cards: { id: string; emoji?: string; image?: string; label?: Record<string, string> }[];
}

export const validateCardSet: LevelValidator = (lvl) => {
  const errors: string[] = [];
  if (typeof lvl.title !== 'object' || lvl.title === null) errors.push('missing title');
  if (typeof lvl.icon !== 'string') errors.push('missing icon');
  if (!Array.isArray(lvl.cards) || lvl.cards.length < 3) errors.push('needs at least 3 cards');
  else {
    const ids = new Set<string>();
    lvl.cards.forEach((c: Record<string, unknown>, i: number) => {
      if (typeof c?.id !== 'string') errors.push(`card ${i} missing id`);
      else if (ids.has(c.id)) errors.push(`card ${i} duplicate id`);
      else ids.add(c.id);
      if (typeof c?.emoji !== 'string' && typeof c?.image !== 'string') errors.push(`card ${i} needs emoji or image`);
    });
  }
  return errors;
};
