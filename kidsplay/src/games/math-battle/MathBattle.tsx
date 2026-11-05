import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactGameProps } from '../../core/game-engine/reactGame';
import type { GameContext } from '../../core/game-engine/types';
import { adapt, fromPack, generatePair, generateQuestion, isCorrect, mathStars, startLevel, type Question } from './questions';
import { MATH_CONTENT_TYPE, type QuestionSet } from './content';
import { createRng, shuffle, timeSeed } from '../../shared/utils/random';
import { loc } from '../../shared/utils/text';
import { GameScreen } from '../../shared/components/gameUi';
import { useInterval } from '../../shared/components/ui';
import './math.css';

const SOLO_STEPS = 10;
const VS_ROUNDS = 8;
const TIMER_SECONDS = 20;
const MAX_HINTS = 3;
const RUNNERS = ['🏃', '🏃‍♀️'];

export function fmtNum(s: string, locale: string): string {
  if (locale !== 'ar') return s;
  return s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

export default function MathBattle({ ctx, paused }: ReactGameProps) {
  const { t, content } = ctx.services;
  const sets = (content.items<QuestionSet>(MATH_CONTENT_TYPE) as QuestionSet[]).filter((s) => s.ageGroups.includes(ctx.ageGroup));
  const [source, setSource] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  if (source === null) {
    return (
      <GameScreen background="linear-gradient(180deg,#ede7f6,#e3f2fd)">
        <div className="col" style={{ alignItems: 'center', margin: 'auto', gap: 16, width: 'min(520px,100%)' }}>
          <div className="math-hero anim-bob">🏁</div>
          <h2 className="subtitle">{t('math-battle:source')}</h2>
          <button className="btn btn-big btn-secondary" style={{ width: '100%' }} onClick={() => setSource('generated')} data-testid="math-start">
            ✨ {t('math-battle:generated')}
          </button>
          {sets.map((s) => (
            <button key={s.id} className="btn btn-big" style={{ width: '100%' }} onClick={() => setSource(s.id)} data-testid={`math-set-${s.id}`}>
              📦 {loc(s.title, ctx.locale)}
            </button>
          ))}
        </div>
      </GameScreen>
    );
  }
  return (
    <Race
      key={`${source}-${run}`}
      ctx={ctx}
      paused={paused}
      set={sets.find((s) => s.id === source) ?? null}
      onDone={() => {
        setRun((r) => r + 1);
        setSource(null);
      }}
    />
  );
}

function Race({ ctx, paused, set, onDone }: { ctx: GameContext; paused: boolean; set: QuestionSet | null; onDone: () => void }) {
  const { t, audio } = ctx.services;
  const versus = ctx.mode === 'versus';
  const rng = useMemo(() => createRng(timeSeed()), []);
  const packQueue = useRef<Question[]>(set ? shuffle(rng, set.questions).map((q) => fromPack(rng, q)) : []);
  const [level, setLevel] = useState(startLevel(ctx.difficulty));
  const adaptState = useRef({ streak: 0, misses: 0 });
  const pending = useRef<Question | null>(null); // second question of a fair versus pair
  const nextQuestion = (lv: number): Question => {
    if (set) {
      if (!packQueue.current.length) packQueue.current = shuffle(rng, set.questions).map((q) => fromPack(rng, q));
      return packQueue.current.shift()!;
    }
    if (versus) {
      if (pending.current) {
        const q = pending.current;
        pending.current = null;
        return q;
      }
      const [a, b] = generatePair(rng, ctx.ageGroup, lv);
      pending.current = b;
      return a;
    }
    return generateQuestion(rng, ctx.ageGroup, lv);
  };
  const [question, setQuestion] = useState<Question>(() => nextQuestion(level));
  const [positions, setPositions] = useState<number[]>(versus ? [0, 0] : [0]);
  const [turn, setTurn] = useState(0);
  const [turnsTaken, setTurnsTaken] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hints, setHints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [finished, setFinished] = useState(false);
  const locked = useRef(false);
  const timers = useRef<number[]>([]);
  const timerOn = !!ctx.options.timer && ctx.ageGroup !== '4-6';
  const goal = versus ? VS_ROUNDS : SOLO_STEPS;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useInterval(() => setTimeLeft((s) => s - 1), timerOn && !paused && !finished && !feedback ? 1000 : null);
  useEffect(() => {
    if (timerOn && timeLeft <= 0 && !locked.current) onTimeout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const advance = (lv: number, nextTurn: number) => {
    setQuestion(nextQuestion(lv));
    setWrong([]);
    setHidden([]);
    setShowHint(false);
    setFeedback(null);
    setTimeLeft(TIMER_SECONDS);
    setTurn(nextTurn);
    locked.current = false;
  };

  const finish = (pos: number[], m: number, correct: number) => {
    setFinished(true);
    audio.play('win');
    let winner: number | undefined;
    if (versus) winner = pos[0] === pos[1] ? -1 : pos[0] > pos[1] ? 0 : 1;
    later(() => {
      ctx.reportResult({
        levelId: set ? `pack:${set.id}` : `race:${ctx.difficulty}`,
        score: versus ? Math.max(...pos) * 100 : Math.max(10, correct * 100 - m * 25 - hints * 20),
        stars: versus ? 3 : mathStars(m + Math.floor(hints / 2)),
        completed: true,
        winner,
        stats: { correct },
      });
      onDone();
    }, 1600);
  };

  const onTimeout = () => {
    if (locked.current) return;
    audio.play('error');
    setFeedback('timeout');
    locked.current = true;
    endTurn(false);
  };

  const endTurn = (correct: boolean) => {
    const pos = [...positions];
    if (correct) pos[turn] = Math.min(goal, pos[turn] + 1);
    setPositions(pos);
    const taken = turnsTaken + 1;
    setTurnsTaken(taken);
    let lv = level;
    if (!versus && !set) {
      const st = adaptState.current;
      const next = adapt(level, correct && wrong.length === 0 ? st.streak + 1 : 0, correct ? st.misses : st.misses + 1);
      adaptState.current = { streak: next.streak, misses: next.misses };
      lv = next.level;
      setLevel(lv);
    }
    const newCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrect);
    const m = mistakes + (correct ? 0 : 1);
    const done = versus ? taken >= VS_ROUNDS * 2 : pos[0] >= goal;
    later(
      () => {
        if (done) finish(pos, m, newCorrect);
        else advance(lv, versus ? 1 - turn : 0);
      },
      correct ? 900 : 1400,
    );
  };

  const choose = (c: string) => {
    if (locked.current || paused || finished || wrong.includes(c)) return;
    if (isCorrect(question, c)) {
      locked.current = true;
      audio.play('success');
      setFeedback('correct');
      endTurn(true);
    } else {
      audio.play('error');
      setMistakes((m) => m + 1);
      setWrong((w) => [...w, c]);
      if (versus) {
        // One attempt per turn in two-player mode keeps it fair.
        locked.current = true;
        setFeedback('wrong');
        endTurn(false);
      } else {
        setFeedback('wrong');
        if (!showHint) setShowHint(true);
        later(() => setFeedback((f) => (f === 'wrong' ? null : f)), 700);
      }
    }
  };

  const useHint = () => {
    if (hints >= MAX_HINTS || locked.current) return;
    audio.play('unlock');
    setHints((h) => h + 1);
    setShowHint(true);
    const wrongs = question.choices.filter((c) => !isCorrect(question, c) && !wrong.includes(c));
    setHidden(shuffle(rng, wrongs).slice(0, 2));
  };

  const prompt = question.localizedText
    ? loc(question.localizedText, ctx.locale)
    : question.textKey
      ? t(question.textKey, question.textParams?.word ? { word: t(String(question.textParams.word)) } : undefined)
      : '';

  return (
    <div className="math-root" data-testid="math-race">
      <div className="hud" style={{ padding: '6px 8px 0' }}>
        {versus ? (
          <span className="pill" data-testid="math-round">
            {t('math-battle:round', { n: Math.min(VS_ROUNDS, Math.floor(turnsTaken / 2) + 1), total: VS_ROUNDS })} · {t('math-battle:turn', { name: ctx.players[turn].name })}
          </span>
        ) : (
          <>
            <span className="pill">✅ {correctCount}</span>
            {!set && <span className="pill">📈 {t('math-battle:level', { n: level + 1 })}</span>}
            <button className="btn btn-sm btn-secondary" onClick={useHint} disabled={hints >= MAX_HINTS} data-testid="math-hint">
              💡 {MAX_HINTS - hints}
            </button>
          </>
        )}
        {timerOn && (
          <span className={`pill ${timeLeft <= 5 ? 'anim-pulse' : ''}`} data-testid="math-timer">
            ⏱️ {timeLeft}
          </span>
        )}
      </div>

      <div className="math-track" aria-hidden>
        {positions.map((p, i) => (
          <div key={i} className="math-lane" style={{ ['--lane' as string]: ctx.players[i]?.color ?? '#ff7a59' }}>
            <span className="math-lane-name">{ctx.players[i]?.name}</span>
            <div className="math-lane-road">
              {Array.from({ length: goal }, (_, k) => (
                <span key={k} className="math-tick" />
              ))}
              <span className="math-flag">🏁</span>
              <span className={`math-runner ${versus && turn === i ? 'active' : ''}`} style={{ insetInlineStart: `calc(${(p / goal) * 100}% * 0.9)` }}>
                <span className="flip-rtl">{RUNNERS[i]}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={`math-card ${feedback ?? ''}`} data-testid="math-question">
        {question.visual && (
          <div className="math-visual" aria-label={String(question.visual.count)}>
            {Array.from({ length: question.visual.count }, (_, i) => (
              <span key={i}>{question.visual!.emoji}</span>
            ))}
          </div>
        )}
        {prompt && <div className="math-prompt">{prompt}</div>}
        {question.text && (
          <div className="math-expr" dir="ltr">
            {fmtNum(question.text, ctx.locale)}
          </div>
        )}
        {feedback === 'correct' && <div className="math-feedback ok">🎉 {t('math-battle:correct')}</div>}
        {feedback === 'wrong' && <div className="math-feedback bad">🙈 {t('math-battle:tryAgain')}</div>}
        {feedback === 'timeout' && <div className="math-feedback bad">⏰ {t('math-battle:timeUp')}</div>}
        {showHint && !versus && <div className="math-hint">💡 {t(question.hintKey)}</div>}
      </div>

      <div className="math-choices">
        {question.choices.map((c) => (
          <button
            key={c}
            className={`btn btn-big math-choice ${wrong.includes(c) ? 'wrong' : ''} ${feedback === 'correct' && isCorrect(question, c) ? 'right' : ''}`}
            disabled={hidden.includes(c) || wrong.includes(c) || finished}
            style={{ visibility: hidden.includes(c) ? 'hidden' : 'visible' }}
            onClick={() => choose(c)}
            data-testid="math-choice"
            data-value={c}
            dir="ltr"
          >
            {fmtNum(c, ctx.locale)}
          </button>
        ))}
      </div>
    </div>
  );
}
