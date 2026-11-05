import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ReactGameProps } from '../../core/game-engine/reactGame';
import { useGameProgress } from '../../core/game-engine/hooks';
import { PuzzleEngine, gridSize, puzzleStars, rectShape } from './engine';
import { PUZZLE_CONTENT_TYPE, PUZZLE_THEMES, type PuzzleImage } from './content';
import { createRng, timeSeed } from '../../shared/utils/random';
import { loc } from '../../shared/utils/text';
import { GameScreen, LevelGrid } from '../../shared/components/gameUi';
import './puzzle.css';

const FREE_LEVELS = 4;

export default function PuzzleGame({ ctx, paused }: ReactGameProps) {
  const { t, content } = ctx.services;
  const progress = useGameProgress(ctx);
  const images = content.items<PuzzleImage>(PUZZLE_CONTENT_TYPE) as PuzzleImage[];
  const [current, setCurrent] = useState<PuzzleImage | null>(null);
  const [theme, setTheme] = useState<string>('all');
  const { rows, cols } = gridSize(ctx.difficulty, ctx.ageGroup);
  const lvl = (id: string) => `${id}:${ctx.difficulty}`;

  if (!current) {
    const themes = ['all', ...PUZZLE_THEMES.filter((th) => images.some((i) => i.theme === th)), ...new Set(images.map((i) => i.theme).filter((th) => !PUZZLE_THEMES.includes(th)))];
    const list = images.filter((i) => theme === 'all' || i.theme === theme);
    return (
      <GameScreen background="linear-gradient(180deg,#e3f2fd,#f3e5f5)">
        <h2 className="subtitle" style={{ textAlign: 'center' }}>
          🧩 {t('puzzle-world:choose')} · {t('puzzle-world:pieces', { n: rows * cols })}
        </h2>
        <div className="segmented" style={{ justifyContent: 'center' }}>
          {themes.map((th) => (
            <button key={th} className={`btn btn-sm ${theme === th ? 'btn-secondary' : ''}`} onClick={() => setTheme(th)}>
              {th === 'all' ? '✨' : t(`puzzle-world:theme.${th}`, { defaultValue: th })}
            </button>
          ))}
        </div>
        <LevelGrid
          minWidth={140}
          levels={list.map((img) => {
            const index = images.indexOf(img);
            const prevDone = index === 0 || progress.levels[lvl(images[index - 1].id)]?.completed;
            return {
              id: img.id,
              label: loc(img.title, ctx.locale),
              icon: <img src={content.assetUrl(img.packId, img.image)} alt="" className="puzzle-thumb" />,
              stars: progress.levels[lvl(img.id)]?.stars ?? 0,
              locked: index >= FREE_LEVELS && !prevDone && !progress.levels[lvl(img.id)],
            };
          })}
          onPick={(id) => setCurrent(images.find((i) => i.id === id) ?? null)}
        />
      </GameScreen>
    );
  }
  return <PuzzleBoard key={current.id} ctx={ctx} paused={paused} image={current} rows={rows} cols={cols} levelId={lvl(current.id)} onDone={() => setCurrent(null)} />;
}

function PuzzleBoard({
  ctx,
  paused,
  image,
  rows,
  cols,
  levelId,
  onDone,
}: ReactGameProps & { image: PuzzleImage; rows: number; cols: number; levelId: string; onDone: () => void }) {
  const { t, audio, content } = ctx.services;
  const engineRef = useRef<PuzzleEngine>(new PuzzleEngine(rows, cols));
  const engine = engineRef.current;
  const tableRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ W: number; H: number; B: number; bx: number; by: number; landscape: boolean } | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const drag = useRef<{ id: number; dx: number; dy: number; pointer: number } | null>(null);
  const [hints, setHints] = useState(0);
  const [hintPiece, setHintPiece] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const [done, setDone] = useState(false);
  const [ghost, setGhost] = useState(ctx.ageGroup === '4-6');
  const timers = useRef<number[]>([]);
  const url = content.assetUrl(image.packId, image.image);
  const shape = rectShape;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Responsive layout: board + tray side by side (landscape) or stacked (portrait).
  useLayoutEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    let lastMode: boolean | null = null;
    const compute = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const landscape = W > H * 1.15;
      const B = Math.floor(landscape ? Math.min(H * 0.94, W * 0.56) : Math.min(W * 0.94, H * 0.56));
      const bx = landscape ? Math.round(W * 0.02) : Math.round((W - B) / 2);
      const by = landscape ? Math.round((H - B) / 2) : Math.round(H * 0.02);
      if (lastMode !== landscape) {
        // (Re)scatter unplaced pieces into the tray area for this orientation.
        const tray = landscape
          ? { x: (bx + B + 12 - bx) / B, y: (8 - by) / B, w: (W - (bx + B + 12) - 8) / B, h: (H - 16) / B }
          : { x: (8 - bx) / B, y: (by + B + 12 - by) / B, w: (W - 16) / B, h: (H - (by + B + 12) - 8) / B };
        engine.scatter(createRng(timeSeed()), tray);
        lastMode = landscape;
      }
      setLayout({ W, H, B, bx, by, landscape });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [engine]);

  const toBoard = (clientX: number, clientY: number) => {
    const rect = tableRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - layout!.bx) / layout!.B, y: (clientY - rect.top - layout!.by) / layout!.B };
  };

  const onDown = (e: RPointerEvent, id: number) => {
    if (paused || done) return;
    const p = engine.pieces[id];
    if (p.placed) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pt = toBoard(e.clientX, e.clientY);
    drag.current = { id, dx: pt.x - p.x, dy: pt.y - p.y, pointer: e.pointerId };
    engine.bringToFront(id);
    audio.play('pop');
    rerender();
  };
  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const pt = toBoard(e.clientX, e.clientY);
    engine.move(d.id, pt.x - d.dx, pt.y - d.dy);
    rerender();
  };
  const onUp = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    const pt = toBoard(e.clientX, e.clientY);
    const snapped = engine.drop(d.id, pt.x - d.dx, pt.y - d.dy);
    audio.play(snapped ? 'match' : 'tap');
    if (snapped && engine.isComplete) complete();
    rerender();
  };

  const complete = () => {
    setDone(true);
    audio.play('win');
    timers.current.push(
      window.setTimeout(() => {
        ctx.reportResult({
          levelId,
          score: engine.total * 50 - engine.misdrops * 5 - hints * 30,
          stars: puzzleStars(hints, engine.misdrops, engine.total),
          completed: true,
          stats: { pieces: engine.total },
        });
        onDone();
      }, 1500),
    );
  };

  const hint = () => {
    if (done || paused) return;
    const remaining = engine.pieces.filter((p) => !p.placed);
    if (!remaining.length) return;
    setHints((h) => h + 1);
    audio.play('unlock');
    if (ctx.ageGroup === '4-6') {
      // Youngest players: gently place a piece for them.
      engine.placeOne(remaining[0].id);
      if (engine.isComplete) complete();
      rerender();
      return;
    }
    setHintPiece(remaining[0].id);
    engine.bringToFront(remaining[0].id);
    timers.current.push(window.setTimeout(() => setHintPiece(null), 1800));
  };

  const L = layout;
  return (
    <div className="puzzle-root">
      <div className="hud" style={{ padding: '6px 8px 0' }}>
        <span className="pill" data-testid="puzzle-count">
          🧩 {engine.placedCount}/{engine.total}
        </span>
        <button className="btn btn-sm" onClick={() => setPeek((v) => !v)} aria-pressed={peek} data-testid="puzzle-peek">
          👀 {t('puzzle-world:preview')}
        </button>
        <button className="btn btn-sm" onClick={() => setGhost((v) => !v)} aria-pressed={ghost} aria-label={t('puzzle-world:ghost')}>
          {ghost ? '🌕' : '🌑'}
        </button>
        <button className="btn btn-sm btn-secondary" onClick={hint} data-testid="puzzle-hint">
          💡 {t('common.hint')}
        </button>
      </div>
      <div className="puzzle-table" ref={tableRef} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {L && (
          <>
            <div className={`puzzle-board${done ? ' done' : ''}`} style={{ left: L.bx, top: L.by, width: L.B, height: L.B }} data-testid="puzzle-board">
              {ghost && <div className="puzzle-ghost" style={{ backgroundImage: `url("${url}")` }} />}
              {Array.from({ length: rows * cols }, (_, i) => {
                const r = Math.floor(i / cols);
                const c = i % cols;
                const target = hintPiece !== null && engine.pieces[hintPiece].row === r && engine.pieces[hintPiece].col === c;
                return (
                  <div
                    key={i}
                    className={`puzzle-slot${target ? ' target' : ''}`}
                    style={{ left: `${(c / cols) * 100}%`, top: `${(r / rows) * 100}%`, width: `${100 / cols}%`, height: `${100 / rows}%` }}
                  />
                );
              })}
            </div>
            {engine.pieces.map((p) => (
              <div
                key={p.id}
                className={`puzzle-piece${p.placed ? ' placed' : ''}${hintPiece === p.id ? ' hinted' : ''}${drag.current?.id === p.id ? ' dragging' : ''}`}
                data-testid="puzzle-piece"
                data-row={p.row}
                data-col={p.col}
                onPointerDown={(e) => onDown(e, p.id)}
                style={{
                  left: L.bx + p.x * L.B,
                  top: L.by + p.y * L.B,
                  width: L.B / cols,
                  height: L.B / rows,
                  zIndex: p.placed ? 1 : 10 + p.z,
                  backgroundImage: `url("${url}")`,
                  backgroundSize: `${L.B}px ${L.B}px`,
                  backgroundPosition: `${(-p.col * L.B) / cols}px ${(-p.row * L.B) / rows}px`,
                  clipPath: shape.clipPath(p, rows, cols),
                }}
              />
            ))}
          </>
        )}
        {peek && (
          <div className="puzzle-peek" onClick={() => setPeek(false)}>
            <img src={url} alt={loc(image.title, ctx.locale)} />
          </div>
        )}
      </div>
    </div>
  );
}
