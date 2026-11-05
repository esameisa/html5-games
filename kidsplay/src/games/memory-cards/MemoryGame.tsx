import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactGameProps } from '../../core/game-engine/reactGame';
import { useGameProgress } from '../../core/game-engine/hooks';
import { CARD_COUNTS, MemoryEngine, gridFor, memoryScore, memoryStars } from './engine';
import { MEMORY_CONTENT_TYPE, type CardSet } from './content';
import { createRng, shuffle, timeSeed } from '../../shared/utils/random';
import { formatTime, loc } from '../../shared/utils/text';
import { GameScreen, LevelGrid, PlayerScores } from '../../shared/components/gameUi';
import { useInterval } from '../../shared/components/ui';
import './memory.css';

const MAX_HINTS = 3;

export default function MemoryGame({ ctx, paused }: ReactGameProps) {
  const { t, audio, content } = ctx.services;
  const progress = useGameProgress(ctx);
  const sets = content.items<CardSet>(MEMORY_CONTENT_TYPE) as CardSet[];
  const [setId, setSetId] = useState<string | null>(() => (progress.data.lastSet as string) ?? null);
  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const versus = ctx.mode === 'versus';

  const levelId = (id: string) => `${id}:${ctx.difficulty}`;

  if (phase === 'select' || !setId) {
    return (
      <GameScreen background="linear-gradient(180deg,#fff3e0,#fce4ec)">
        <h2 className="subtitle" style={{ textAlign: 'center' }}>
          {t('memory-cards:chooseTheme')} · {t(`difficulty.${ctx.difficulty}`)} ({CARD_COUNTS[ctx.difficulty]} {t('memory-cards:cards')})
        </h2>
        <LevelGrid
          levels={sets.map((s) => ({
            id: s.id,
            label: loc(s.title, ctx.locale),
            icon: s.icon,
            color: s.color,
            stars: progress.levels[levelId(s.id)]?.stars ?? 0,
          }))}
          onPick={(id) => {
            setSetId(id);
            setPhase('play');
            void ctx.services.progress.saveData({ lastSet: id });
          }}
        />
      </GameScreen>
    );
  }

  const set = sets.find((s) => s.id === setId) ?? sets[0];
  return (
    <MemoryBoard
      key={`${set.id}-${ctx.difficulty}`}
      set={set}
      ctx={ctx}
      paused={paused}
      versus={versus}
      onFinished={() => setPhase('select')}
      levelId={levelId(set.id)}
      audioPlay={audio.play.bind(audio)}
      t={t}
    />
  );
}

function MemoryBoard({
  set,
  ctx,
  paused,
  versus,
  levelId,
  onFinished,
  audioPlay,
  t,
}: ReactGameProps & {
  set: CardSet;
  versus: boolean;
  levelId: string;
  onFinished: () => void;
  audioPlay: (n: 'flip' | 'match' | 'error' | 'win' | 'tap') => void;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const pairs = Math.min(CARD_COUNTS[ctx.difficulty] / 2, set.cards.length);
  const engineRef = useRef<MemoryEngine | null>(null);
  if (!engineRef.current) {
    const rng = createRng(timeSeed());
    const faces = shuffle(rng, set.cards).slice(0, pairs).map((c) => c.id);
    engineRef.current = new MemoryEngine(faces, rng, versus ? 2 : 1);
  }
  const engine = engineRef.current;
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [seconds, setSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hinted, setHinted] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState(() => gridFor(engine.cards.length, 1));
  const showTimer = ctx.options.timer ?? false;

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => setGrid(gridFor(engine.cards.length, el.clientWidth / Math.max(1, el.clientHeight)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [engine]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  useInterval(() => setSeconds((s) => s + 1), paused || done ? null : 1000);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const finish = useCallback(() => {
    setDone(true);
    audioPlay('win');
    const winner = versus ? engine.winner() : undefined;
    later(() => {
      ctx.reportResult({
        levelId,
        score: versus ? Math.max(...engine.scores) * 100 : memoryScore(engine.moves, engine.pairs, seconds),
        stars: versus ? 3 : memoryStars(engine.moves, engine.pairs, hintsUsed),
        completed: true,
        winner,
        stats: { pairs: engine.pairs, moves: engine.moves },
      });
      onFinished();
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, versus, seconds, hintsUsed]);

  const onCard = (i: number) => {
    if (paused || done) return;
    const out = engine.flip(i);
    if (out.kind === 'ignored') return;
    audioPlay('flip');
    if (out.kind === 'match') {
      later(() => audioPlay('match'), 250);
      if (engine.isComplete) finish();
    } else if (out.kind === 'mismatch') {
      later(() => {
        audioPlay('error');
        engine.resolveMismatch();
        rerender();
      }, 950);
    }
    rerender();
  };

  const useHint = () => {
    if (hintsUsed >= MAX_HINTS || done || engine.pendingMismatch) return;
    const pair = engine.hintPair();
    if (!pair) return;
    audioPlay('tap');
    setHintsUsed((h) => h + 1);
    setHinted(pair);
    later(() => setHinted([]), 1200);
  };

  const faceOf = (faceId: string) => set.cards.find((c) => c.id === faceId);

  return (
    <GameScreen background={`linear-gradient(180deg, ${set.color}55, #fff7fb)`}>
      <div className="hud">
        {versus ? (
          <PlayerScores players={ctx.players} scores={engine.scores} current={engine.currentPlayer} />
        ) : (
          <>
            <span className="pill" data-testid="memory-moves">
              👆 {t('common.moves')}: {engine.moves}
            </span>
            <span className="pill">
              🎯 {engine.matchedPairs}/{engine.pairs}
            </span>
            {showTimer && <span className="pill">⏱️ {formatTime(seconds)}</span>}
          </>
        )}
        {!versus && (
          <button className="btn btn-sm btn-secondary" onClick={useHint} disabled={hintsUsed >= MAX_HINTS} data-testid="memory-hint">
            💡 {t('common.hint')} ({MAX_HINTS - hintsUsed})
          </button>
        )}
      </div>
      <div ref={boardRef} className="memory-board" style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gridTemplateRows: `repeat(${grid.rows}, 1fr)` }}>
        {engine.cards.map((c, i) => {
          const face = faceOf(c.faceId);
          const up = c.faceUp || c.matched || hinted.includes(i);
          return (
            <button
              key={c.uid}
              className={`memory-card${up ? ' up' : ''}${c.matched ? ' matched' : ''}${hinted.includes(i) ? ' hinted' : ''}`}
              onClick={() => onCard(i)}
              aria-label={up ? (loc(face?.label, ctx.locale) || face?.emoji || 'card') : t('memory-cards:hidden')}
              data-testid="memory-card"
              data-face={c.faceId}
            >
              <span className="memory-card-inner">
                <span className="memory-face memory-back" style={{ background: `linear-gradient(135deg, ${set.color}, #7c5cff)` }}>
                  <span>{set.icon}</span>
                </span>
                <span className="memory-face memory-front">
                  {face?.image ? <img src={ctx.services.content.assetUrl(set.packId, face.image)} alt="" /> : <span>{face?.emoji}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </GameScreen>
  );
}
