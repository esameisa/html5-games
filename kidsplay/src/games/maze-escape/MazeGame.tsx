import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import type { ReactGameProps } from '../../core/game-engine/reactGame';
import { useGameProgress } from '../../core/game-engine/hooks';
import { MazeScene, type Dir } from './MazeScene';
import { mazeStars, resolveGrid, solveMaze } from './maze';
import { MAZE_CONTENT_TYPE, type MazeLevel } from './content';
import { GameScreen, LevelGrid } from '../../shared/components/gameUi';
import { formatTime, loc } from '../../shared/utils/text';
import { useInterval } from '../../shared/components/ui';
import './maze.css';

const KEY_EMOJI = ['🟡', '🔵', '🩷'];

export default function MazeGame({ ctx, paused }: ReactGameProps) {
  const { t, content } = ctx.services;
  const progress = useGameProgress(ctx);
  const all = content.items<MazeLevel>(MAZE_CONTENT_TYPE) as MazeLevel[];
  const diff = ctx.difficulty === 'expert' ? 'hard' : ctx.difficulty;
  const levels = all.filter((l) => l.difficulty === diff);
  const [current, setCurrent] = useState<MazeLevel | null>(null);

  if (!current) {
    return (
      <GameScreen background="linear-gradient(180deg,#dcedc8,#e0f7fa)">
        <h2 className="subtitle" style={{ textAlign: 'center' }}>
          🌿 {t('maze-escape:choose')} · {t(`difficulty.${diff}`)}
        </h2>
        <LevelGrid
          minWidth={110}
          levels={levels.map((l, i) => ({
            id: l.id,
            label: l.title ? loc(l.title, ctx.locale) : `${t('common.level')} ${i + 1}`,
            icon: l.requireAllStars ? '🌟' : '🗺️',
            stars: progress.levels[l.id]?.stars ?? 0,
            locked: i > 0 && !progress.levels[levels[i - 1].id]?.completed && !progress.levels[l.id]?.completed,
          }))}
          onPick={(id) => setCurrent(levels.find((l) => l.id === id) ?? null)}
        />
      </GameScreen>
    );
  }
  const idx = levels.indexOf(current);
  return (
    <MazePlay
      key={current.id}
      ctx={ctx}
      paused={paused}
      level={current}
      onDone={(next) => setCurrent(next && idx + 1 < levels.length ? levels[idx + 1] : null)}
    />
  );
}

function MazePlay({ ctx, paused, level, onDone }: ReactGameProps & { level: MazeLevel; onDone: (next: boolean) => void }) {
  const { t, audio } = ctx.services;
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MazeScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const grid = useMemo(() => resolveGrid(level), [level]);
  const solved = useMemo(() => solveMaze(grid), [grid]);
  const [stars, setStars] = useState<[number, number]>([0, 0]);
  const [keys, setKeys] = useState<boolean[]>([false, false, false]);
  const [seconds, setSeconds] = useState(0);
  const [toast, setToast] = useState('');
  const [won, setWon] = useState(false);
  const stateRef = useRef({ stars: [0, 0] as [number, number], seconds: 0 });
  stateRef.current = { stars, seconds };
  const keyCount = level.generator?.keys ?? (grid.join('').match(/[abc]/g)?.length || 0);
  const swipe = ctx.options.swipe ?? true;

  useInterval(() => setSeconds((s) => s + 1), paused || won ? null : 1000);

  useEffect(() => {
    const host = hostRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scene = new MazeScene();
    sceneRef.current = scene;
    const color = parseInt((ctx.players[0]?.color ?? '#ff7a59').replace('#', ''), 16);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      transparent: false,
      backgroundColor: '#bfe8a6',
      scale: { mode: Phaser.Scale.NONE, width: Math.max(1, host.clientWidth * dpr), height: Math.max(1, host.clientHeight * dpr), zoom: 1 / dpr },
      render: { antialias: true, powerPreference: 'low-power' },
      banner: false,
      audio: { noAudio: true },
      input: { activePointers: 2 },
      scene: [],
    });
    gameRef.current = game;
    game.scene.add('maze', scene, true, {
      grid,
      requireAllStars: !!level.requireAllStars,
      playerColor: color,
      callbacks: {
        onStars: (c: number, total: number) => setStars([c, total]),
        onKeys: (k: boolean[]) => setKeys(k),
        onMove: () => audio.play('step'),
        onBump: () => audio.play('tap'),
        onPickup: (kind: string) => audio.play(kind === 'star' ? 'coin' : kind === 'key' ? 'unlock' : 'whoosh'),
        onExitLocked: () => {
          audio.play('error');
          setToast(t('maze-escape:needStars'));
          window.setTimeout(() => setToast(''), 1800);
        },
        onWin: () => {
          setWon(true);
          audio.play('win');
          const { stars: [c, total], seconds: secs } = stateRef.current;
          ctx.reportResult({
            levelId: level.id,
            score: Math.max(10, 1000 - secs * 5 + c * 100),
            stars: mazeStars({ collected: c, total, seconds: secs, pathLength: solved.pathLength }),
            completed: true,
            stats: { stars: c },
          });
          window.setTimeout(() => onDone(true), 400);
        },
      },
    });
    const ro = new ResizeObserver(() => {
      const w = Math.max(1, host.clientWidth * dpr);
      const h = Math.max(1, host.clientHeight * dpr);
      game.scale.resize(w, h);
      game.scale.setZoom(1 / dpr);
    });
    ro.observe(host);
    return () => {
      ro.disconnect();
      sceneRef.current = null;
      gameRef.current = null;
      game.destroy(true); // releases WebGL context, textures and the RAF loop
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (paused) {
      game.scene.pause('maze');
      game.loop.sleep();
    } else {
      game.loop.wake();
      game.scene.resume('maze');
    }
  }, [paused]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.swipeEnabled = swipe;
  }, [swipe]);

  const press = (d: Dir) => !paused && sceneRef.current?.press(d);
  const release = (d: Dir) => sceneRef.current?.release(d);
  const pad = (d: Dir, label: string, cls: string) => (
    <button
      className={`btn maze-pad-btn ${cls}`}
      aria-label={d}
      data-testid={`maze-${d}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        press(d);
      }}
      onPointerUp={() => release(d)}
      onPointerCancel={() => release(d)}
      onPointerLeave={() => release(d)}
    >
      {label}
    </button>
  );

  return (
    <div className="maze-root">
      <div className="hud" style={{ padding: '6px 8px' }}>
        <span className="pill" data-testid="maze-stars">
          ⭐ {stars[0]}/{stars[1]}
        </span>
        {keyCount > 0 && (
          <span className="pill" aria-label={t('maze-escape:keys')}>
            🗝️ {keys.slice(0, keyCount).map((k, i) => (k ? KEY_EMOJI[i] : '⚪')).join(' ')}
          </span>
        )}
        <span className="pill">⏱️ {formatTime(seconds)}</span>
        {level.requireAllStars && <span className="pill small">🌟 {t('maze-escape:needStars')}</span>}
      </div>
      <div className="maze-host" ref={hostRef} data-testid="maze-canvas" />
      <div className="maze-pad" dir="ltr">
        {pad('up', '▲', 'up')}
        {pad('left', '◀', 'left')}
        {pad('right', '▶', 'right')}
        {pad('down', '▼', 'down')}
      </div>
      {toast && <div className="maze-toast pill">{toast}</div>}
    </div>
  );
}
