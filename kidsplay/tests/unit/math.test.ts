import { describe, expect, it } from 'vitest';
import { adapt, fromPack, generatePair, generateQuestion, isCorrect, normalize, numericChoices, simplify, validateQuestion, type QuestionKind } from '../../src/games/math-battle/questions';
import { validateQuestionSet } from '../../src/games/math-battle/content';
import pack from '../../src/games/math-battle/question-sets.json';
import { createRng } from '../../src/shared/utils/random';
import type { AgeGroup } from '../../src/core/game-engine/types';

function evaluate(text: string): number {
  // Evaluate generated arithmetic safely (only digits, operators, brackets, slash).
  const expr = text.replace('= ?', '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!/^[\d\s+\-*/().]+$/.test(expr)) throw new Error('unexpected ' + expr);
  return Function(`"use strict"; return (${expr});`)() as number;
}

describe('math battle question generator', () => {
  const ages: AgeGroup[] = ['4-6', '7-9', '10-12'];
  it.each(ages)('always yields exactly one correct answer among 4 unique choices (%s)', (age) => {
    const rng = createRng(1234);
    for (let level = 0; level <= 4; level++) {
      for (let i = 0; i < 300; i++) {
        const q = generateQuestion(rng, age, level);
        expect(validateQuestion(q)).toEqual([]);
        expect(q.choices.filter((c) => isCorrect(q, c))).toHaveLength(1);
        for (const c of q.choices) {
          if (!c.includes('/')) expect(Number(c)).toBeGreaterThanOrEqual(0);
        }
        if (q.kind === 'count' || q.kind === 'recognize') expect(q.choices.every((c) => Number(c) >= 1)).toBe(true);
      }
    }
  });

  it('computes arithmetic answers correctly', () => {
    const rng = createRng(99);
    const kinds: QuestionKind[] = ['add', 'sub', 'mul', 'div', 'multistep'];
    for (const kind of kinds) {
      for (let i = 0; i < 200; i++) {
        const q = generateQuestion(rng, '10-12', 4, kind);
        expect(evaluate(q.text!)).toBe(Number(q.answer));
      }
    }
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(rng, '7-9', 4, 'missing');
      const [, a, total] = q.text!.match(/(\d+) \+ \? = (\d+)/)!;
      expect(Number(total) - Number(a)).toBe(Number(q.answer));
      const f = generateQuestion(rng, '10-12', 4, 'fraction_add');
      const [, n1, d, n2] = f.text!.match(/(\d+)\/(\d+) \+ (\d+)\/\d+/)!;
      expect(normalize(f.answer)).toBe(simplify(Number(n1) + Number(n2), Number(d)));
    }
  });

  it('respects age-appropriate content', () => {
    const rng = createRng(5);
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(rng, '4-6', 4);
      expect(['count', 'recognize', 'compare', 'add', 'sub', 'missing']).toContain(q.kind);
      if (q.kind === 'add') expect(Number(q.answer)).toBeLessThanOrEqual(10);
      if (q.kind === 'sub') expect(Number(q.answer)).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates equivalent-difficulty pairs for versus mode', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const [a, b] = generatePair(rng, '7-9', 3);
      expect(a.kind).toBe(b.kind);
    }
  });

  it('adapts difficulty up after a streak and down after misses', () => {
    expect(adapt(1, 3, 0).level).toBe(2);
    expect(adapt(1, 0, 2).level).toBe(0);
    expect(adapt(4, 3, 0).level).toBe(4);
    expect(adapt(0, 0, 2).level).toBe(0);
  });

  it('normalizes equivalent answers', () => {
    expect(normalize('2/4')).toBe('1/2');
    expect(normalize(' 7 ')).toBe('7');
    expect(normalize('4/2')).toBe('2');
    expect(numericChoices(createRng(1), 0, 3)).toContain('0');
  });

  it('validates downloadable question packs', () => {
    for (const set of pack.levels) expect(validateQuestionSet(set as unknown as Record<string, unknown>, 0)).toEqual([]);
    expect(validateQuestionSet({ id: 'x', title: { en: 'x' }, ageGroups: ['7-9'], questions: [{ q: { en: '1+1' }, answer: '2', choices: ['2', '2', '3', '4'] }] } as Record<string, unknown>, 0).length).toBeGreaterThan(0);
    const q = fromPack(createRng(3), { q: { en: '2+2' }, answer: '4' });
    expect(validateQuestion(q)).toEqual([]);
  });
});
