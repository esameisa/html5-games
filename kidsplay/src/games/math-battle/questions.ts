import type { AgeGroup } from '../../core/game-engine/types';
import { pick, randInt, shuffle, type Rng } from '../../shared/utils/random';

export type QuestionKind =
  | 'count'
  | 'recognize'
  | 'compare'
  | 'add'
  | 'sub'
  | 'missing'
  | 'mul'
  | 'div'
  | 'multistep'
  | 'fraction_of'
  | 'fraction_add'
  | 'pack';

export interface Question {
  kind: QuestionKind;
  /** Arithmetic expression or localized text to show. */
  text?: string;
  textKey?: string;
  textParams?: Record<string, string | number>;
  localizedText?: Record<string, string>;
  /** For counting questions: emoji repeated `count` times. */
  visual?: { emoji: string; count: number };
  answer: string;
  choices: string[];
  hintKey: string;
}

/** Each age group has 5 internal levels (0–4) used for in-game adaptation. */
const KINDS: Record<AgeGroup, QuestionKind[][]> = {
  '4-6': [['count'], ['count', 'recognize'], ['compare', 'add'], ['add', 'sub'], ['add', 'sub', 'missing']],
  '7-9': [['add'], ['add', 'sub'], ['sub', 'missing'], ['mul', 'add'], ['mul', 'sub', 'missing']],
  '10-12': [['mul'], ['mul', 'div'], ['div', 'multistep'], ['multistep', 'fraction_of'], ['fraction_of', 'fraction_add', 'multistep']],
};

const COUNT_EMOJI = ['🍎', '⭐', '🐟', '🎈', '🐞', '🌸', '🍪', '🚗', '🦆', '🍓'];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function simplify(n: number, d: number): string {
  const g = gcd(Math.abs(n), Math.abs(d));
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
}

/** Numeric distractors near the answer; always distinct, non-negative, never equal to answer. */
export function numericChoices(rng: Rng, answer: number, spread: number, min = 0, count = 4): string[] {
  const set = new Set<number>([answer]);
  const offsets = shuffle(rng, [-3, -2, -1, 1, 2, 3, 10, -10, 4, 5].map((o) => (Math.abs(o) >= 10 ? Math.sign(o) * Math.max(10, spread) : o)));
  for (const o of offsets) {
    if (set.size >= count) break;
    const v = answer + o;
    if (v >= min) set.add(v);
  }
  let k = 1;
  while (set.size < count) set.add(answer + spread + k++);
  return shuffle(rng, [...set].map(String));
}

function fractionChoices(rng: Rng, n: number, d: number): string[] {
  const ans = simplify(n, d);
  const set = new Set<string>([ans]);
  const candidates = shuffle(rng, [
    [n + 1, d],
    [Math.max(1, n - 1), d],
    [n, d + 1],
    [n + d, d * 2 + 1],
    [n * 2 + 1, d * 2],
    [1, d],
    [d, n + d],
  ]);
  for (const [a, b] of candidates) {
    if (set.size >= 4) break;
    if (b > 0 && a > 0) set.add(simplify(a, b));
  }
  let k = 2;
  while (set.size < 4) set.add(`${k++}/${d + 7}`);
  return shuffle(rng, [...set]);
}

export function generateQuestion(rng: Rng, age: AgeGroup, level: number, forceKind?: QuestionKind): Question {
  const lv = Math.max(0, Math.min(4, Math.round(level)));
  const kind = forceKind ?? pick(rng, KINDS[age][lv]);
  const big = age === '4-6' ? 10 : age === '7-9' ? (lv < 2 ? 20 : 100) : 100;
  switch (kind) {
    case 'count': {
      const count = randInt(rng, 1, lv === 0 ? 5 : 10);
      return { kind, visual: { emoji: pick(rng, COUNT_EMOJI), count }, textKey: 'math-battle:q.count', answer: String(count), choices: numericChoices(rng, count, 2, 1), hintKey: 'math-battle:hint.count' };
    }
    case 'recognize': {
      const n = randInt(rng, 1, 10);
      return { kind, textKey: 'math-battle:q.recognize', textParams: { word: `math-battle:num.${n}` }, answer: String(n), choices: numericChoices(rng, n, 2, 1), hintKey: 'math-battle:hint.recognize' };
    }
    case 'compare': {
      const top = lv < 3 ? 10 : 20;
      const four = shuffle(rng, Array.from({ length: top + 1 }, (_, i) => i)).slice(0, 4);
      return { kind, textKey: 'math-battle:q.bigger', answer: String(Math.max(...four)), choices: four.map(String), hintKey: 'math-battle:hint.compare' };
    }
    case 'add': {
      const a = randInt(rng, age === '4-6' ? 1 : 2, Math.floor(big / 2));
      const b = randInt(rng, 1, big - a);
      return { kind, text: `${a} + ${b} = ?`, answer: String(a + b), choices: numericChoices(rng, a + b, 5), hintKey: 'math-battle:hint.add' };
    }
    case 'sub': {
      const a = randInt(rng, 2, big);
      const b = randInt(rng, 1, a - 1 > 0 ? a - 1 : 1);
      return { kind, text: `${a} − ${b} = ?`, answer: String(a - b), choices: numericChoices(rng, a - b, 5), hintKey: 'math-battle:hint.sub' };
    }
    case 'missing': {
      const a = randInt(rng, 1, Math.floor(big / 2));
      const b = randInt(rng, 1, Math.floor(big / 2));
      return { kind, text: `${a} + ? = ${a + b}`, answer: String(b), choices: numericChoices(rng, b, 4), hintKey: 'math-battle:hint.missing' };
    }
    case 'mul': {
      const max = age === '7-9' ? (lv < 4 ? 5 : 10) : lv === 0 ? 10 : 12;
      const tables = age === '7-9' && lv < 4 ? [2, 5, 10, 3] : undefined;
      const a = tables ? pick(rng, tables) : randInt(rng, 2, max);
      const b = randInt(rng, 1, max);
      return { kind, text: `${a} × ${b} = ?`, answer: String(a * b), choices: numericChoices(rng, a * b, Math.max(a, b)), hintKey: 'math-battle:hint.mul' };
    }
    case 'div': {
      const b = randInt(rng, 2, lv < 2 ? 10 : 12);
      const q = randInt(rng, 1, lv < 2 ? 10 : 12);
      return { kind, text: `${b * q} ÷ ${b} = ?`, answer: String(q), choices: numericChoices(rng, q, 3), hintKey: 'math-battle:hint.div' };
    }
    case 'multistep': {
      const a = randInt(rng, 2, 20);
      const b = randInt(rng, 2, 9);
      const c = randInt(rng, 2, 9);
      if (rng() < 0.5) return { kind, text: `${a} + ${b} × ${c} = ?`, answer: String(a + b * c), choices: numericChoices(rng, a + b * c, b), hintKey: 'math-battle:hint.order' };
      return { kind, text: `(${a} + ${b}) × ${c} = ?`, answer: String((a + b) * c), choices: numericChoices(rng, (a + b) * c, c), hintKey: 'math-battle:hint.brackets' };
    }
    case 'fraction_of': {
      const d = pick(rng, [2, 3, 4, 5, 10]);
      const n = randInt(rng, 1, d - 1);
      const whole = d * randInt(rng, 1, 10);
      const ans = (whole / d) * n;
      return { kind, text: `${n}/${d} × ${whole} = ?`, answer: String(ans), choices: numericChoices(rng, ans, Math.max(2, whole / d)), hintKey: 'math-battle:hint.fractionOf' };
    }
    case 'fraction_add': {
      const d = pick(rng, [3, 4, 5, 6, 8, 10]);
      const a = randInt(rng, 1, d - 2);
      const b = randInt(rng, 1, d - a - 1 > 0 ? d - a - 1 : 1);
      return { kind, text: `${a}/${d} + ${b}/${d} = ?`, answer: simplify(a + b, d), choices: fractionChoices(rng, a + b, d), hintKey: 'math-battle:hint.fractionAdd' };
    }
    default:
      throw new Error(`Unsupported question kind ${kind}`);
  }
}

/** Two questions of the same kind and level (fair turns in two-player mode). */
export function generatePair(rng: Rng, age: AgeGroup, level: number): [Question, Question] {
  const first = generateQuestion(rng, age, level);
  return [first, generateQuestion(rng, age, level, first.kind)];
}

/** Exactly one correct choice, four distinct choices. */
export function validateQuestion(q: Pick<Question, 'answer' | 'choices'>): string[] {
  const e: string[] = [];
  if (q.choices.length !== 4) e.push('needs 4 choices');
  if (new Set(q.choices).size !== q.choices.length) e.push('choices must be unique');
  const correct = q.choices.filter((c) => normalize(c) === normalize(q.answer)).length;
  if (correct !== 1) e.push(`exactly one choice must be correct (found ${correct})`);
  return e;
}

/** Normalizes answers so equivalent forms compare equal ("2/4" == "1/2", " 7 " == "7"). */
export function normalize(v: string): string {
  const s = v.trim();
  const m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m) return simplify(Number(m[1]), Number(m[2]));
  return s;
}

export function isCorrect(q: Question, choice: string): boolean {
  return normalize(choice) === normalize(q.answer);
}

export function startLevel(difficulty: string): number {
  return { easy: 0, medium: 1, hard: 2, expert: 3 }[difficulty] ?? 0;
}

/** In-game adaptation: three first-try correct answers raise the level, two misses lower it. */
export function adapt(level: number, streak: number, misses: number): { level: number; streak: number; misses: number } {
  if (streak >= 3) return { level: Math.min(4, level + 1), streak: 0, misses: 0 };
  if (misses >= 2) return { level: Math.max(0, level - 1), streak: 0, misses: 0 };
  return { level, streak, misses };
}

export function mathStars(mistakes: number): number {
  return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
}

export interface PackQuestion {
  q: Record<string, string>;
  answer: string;
  choices?: string[];
}

/** Turn a downloadable pack question into a playable question (choices generated if absent). */
export function fromPack(rng: Rng, pq: PackQuestion): Question {
  let choices = pq.choices;
  if (!choices) {
    const n = Number(pq.answer);
    choices = Number.isFinite(n) ? numericChoices(rng, n, 3) : [pq.answer];
  }
  return { kind: 'pack', localizedText: pq.q, answer: pq.answer, choices: shuffle(rng, choices), hintKey: 'math-battle:hint.pack' };
}
