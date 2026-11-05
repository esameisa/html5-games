import type { LevelValidator } from '../../core/content-packs/schema';
import { validateQuestion, type PackQuestion } from './questions';

export const MATH_CONTENT_TYPE = 'math_questions';

export interface QuestionSet {
  id: string;
  packId: string;
  title: Record<string, string>;
  ageGroups: string[];
  questions: PackQuestion[];
}

export const validateQuestionSet: LevelValidator = (lvl) => {
  const e: string[] = [];
  if (typeof lvl.title !== 'object' || lvl.title === null) e.push('missing title');
  if (!Array.isArray(lvl.ageGroups) || !lvl.ageGroups.every((a: unknown) => ['4-6', '7-9', '10-12'].includes(String(a)))) e.push('invalid ageGroups');
  if (!Array.isArray(lvl.questions) || lvl.questions.length < 5) e.push('needs at least 5 questions');
  else
    (lvl.questions as Record<string, unknown>[]).forEach((q, i) => {
      if (typeof q?.q !== 'object' || q.q === null || typeof (q.q as Record<string, unknown>).en !== 'string') e.push(`question ${i}: missing text`);
      if (typeof q?.answer !== 'string' || !q.answer) e.push(`question ${i}: missing answer`);
      if (q?.choices !== undefined) {
        if (!Array.isArray(q.choices) || !q.choices.every((c) => typeof c === 'string')) e.push(`question ${i}: invalid choices`);
        else for (const err of validateQuestion({ answer: String(q.answer), choices: q.choices as string[] })) e.push(`question ${i}: ${err}`);
      } else if (!Number.isFinite(Number(q?.answer))) e.push(`question ${i}: non-numeric answers need explicit choices`);
    });
  return e;
};
