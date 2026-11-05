import type { LevelValidator } from '../../core/content-packs/schema';

export const PUZZLE_CONTENT_TYPE = 'puzzle_images';
export const PUZZLE_THEMES = ['animals', 'dinosaurs', 'cars', 'space', 'castles', 'nature'];

export interface PuzzleImage {
  id: string;
  packId: string;
  title: Record<string, string>;
  theme: string;
  image: string;
  /** Optional future extension: 'rect' | 'jigsaw'. */
  shape?: string;
}

export const validatePuzzle: LevelValidator = (lvl) => {
  const e: string[] = [];
  if (typeof lvl.image !== 'string' || !/\.(svg|png|jpe?g|webp)$/i.test(lvl.image)) e.push('image must be svg/png/jpg/webp');
  if (typeof lvl.theme !== 'string') e.push('missing theme');
  if (typeof lvl.title !== 'object' || lvl.title === null) e.push('missing title');
  if (lvl.shape !== undefined && lvl.shape !== 'rect') e.push('unsupported shape');
  return e;
};
