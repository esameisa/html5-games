import type { LevelValidator } from '../../core/content-packs/schema';

export const COLORING_CONTENT_TYPE = 'coloring_templates';

export interface ColoringTemplate {
  id: string;
  packId: string;
  title: Record<string, string>;
  theme: string;
  image: string; // SVG/PNG line art with transparent background
}

export interface Artwork {
  id: string;
  templateId: string;
  templatePack?: string;
  createdAt: string;
  updatedAt: string;
  width: number;
  height: number;
  /** PNG data URL of the paint layer only (so it can be re-edited). */
  paint: string;
  /** Small PNG data URL of the composed picture for the gallery. */
  preview: string;
}

export const validateTemplate: LevelValidator = (lvl) => {
  const e: string[] = [];
  if (typeof lvl.image !== 'string' || !/\.(svg|png)$/i.test(lvl.image)) e.push('image must be svg or png');
  if (typeof lvl.theme !== 'string') e.push('missing theme');
  if (typeof lvl.title !== 'object' || lvl.title === null) e.push('missing title');
  return e;
};
