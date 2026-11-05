/** Cosmetic items are unlocked with coins earned by playing, or by reaching a player level. */
export type CosmeticSlot = 'character' | 'color' | 'hat' | 'accessory';

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  value: string;
  cost: number; // coins (0 = free)
  minLevel: number;
  labelKey: string;
}

export const CHARACTERS = ['bunny', 'bear', 'cat', 'fox', 'dino', 'robot', 'owl', 'panda'] as const;
export const COLORS = ['#ff8fab', '#ffb74d', '#ffd54f', '#81c784', '#4fc3f7', '#9575cd', '#a1887f', '#90a4ae', '#f06292', '#4db6ac'];

export const COSMETICS: CosmeticItem[] = [
  ...CHARACTERS.map((c, i) => ({
    id: `char_${c}`,
    slot: 'character' as const,
    value: c,
    cost: i < 6 ? 0 : 60,
    minLevel: i < 6 ? 1 : 3,
    labelKey: `avatar.char.${c}`,
  })),
  ...COLORS.map((c, i) => ({ id: `color_${i}`, slot: 'color' as const, value: c, cost: i < 6 ? 0 : 20, minLevel: 1, labelKey: 'avatar.color' })),
  { id: 'hat_none', slot: 'hat', value: 'none', cost: 0, minLevel: 1, labelKey: 'avatar.none' },
  { id: 'hat_cap', slot: 'hat', value: 'cap', cost: 0, minLevel: 1, labelKey: 'avatar.hats.cap' },
  { id: 'hat_bow', slot: 'hat', value: 'bow', cost: 15, minLevel: 1, labelKey: 'avatar.hats.bow' },
  { id: 'hat_party', slot: 'hat', value: 'party', cost: 25, minLevel: 1, labelKey: 'avatar.hats.party' },
  { id: 'hat_crown', slot: 'hat', value: 'crown', cost: 80, minLevel: 4, labelKey: 'avatar.hats.crown' },
  { id: 'hat_wizard', slot: 'hat', value: 'wizard', cost: 60, minLevel: 3, labelKey: 'avatar.hats.wizard' },
  { id: 'hat_chef', slot: 'hat', value: 'chef', cost: 40, minLevel: 2, labelKey: 'avatar.hats.chef' },
  { id: 'acc_none', slot: 'accessory', value: 'none', cost: 0, minLevel: 1, labelKey: 'avatar.none' },
  { id: 'acc_glasses', slot: 'accessory', value: 'glasses', cost: 0, minLevel: 1, labelKey: 'avatar.acc.glasses' },
  { id: 'acc_bowtie', slot: 'accessory', value: 'bowtie', cost: 15, minLevel: 1, labelKey: 'avatar.acc.bowtie' },
  { id: 'acc_scarf', slot: 'accessory', value: 'scarf', cost: 30, minLevel: 2, labelKey: 'avatar.acc.scarf' },
  { id: 'acc_star', slot: 'accessory', value: 'star', cost: 50, minLevel: 3, labelKey: 'avatar.acc.star' },
  { id: 'acc_cape', slot: 'accessory', value: 'cape', cost: 90, minLevel: 5, labelKey: 'avatar.acc.cape' },
];

export function isOwned(item: CosmeticItem, unlocked: string[]): boolean {
  return item.cost === 0 && item.minLevel <= 1 ? true : unlocked.includes(item.id);
}

export type PurchaseCheck = { ok: true } | { ok: false; reason: 'level' | 'coins' | 'owned' };

export function canUnlock(item: CosmeticItem, coins: number, level: number, unlocked: string[]): PurchaseCheck {
  if (isOwned(item, unlocked)) return { ok: false, reason: 'owned' };
  if (level < item.minLevel) return { ok: false, reason: 'level' };
  if (coins < item.cost) return { ok: false, reason: 'coins' };
  return { ok: true };
}
