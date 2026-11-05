import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ReactGameProps } from '../../core/game-engine/reactGame';
import type { GameContext } from '../../core/game-engine/types';
import { useGameProgress } from '../../core/game-engine/hooks';
import { buildShelf, chefStars, isNextStep, makeOrders, newRecipesAt, recipesForLevel, validateAssembly, RECIPE_CONTENT_TYPE, type ChefLevel, type Ingredient, type Recipe } from './chef';
import levelsJson from './levels.json';
import { createRng, pick, timeSeed } from '../../shared/utils/random';
import { loc } from '../../shared/utils/text';
import { GameScreen, LevelGrid } from '../../shared/components/gameUi';
import { useInterval } from '../../shared/components/ui';
import './chef.css';

const LEVELS = levelsJson.levels as ChefLevel[];
const CUSTOMERS = ['🧒', '👧', '👦', '👩', '👨', '👵', '👴', '🧑‍🦱', '👩‍🦰', '🐻', '🐰', '🐼'];
const PATIENCE = { easy: 0, medium: 45, hard: 30, expert: 25 } as const;

export default function MiniChef({ ctx, paused }: ReactGameProps) {
  const { t, content } = ctx.services;
  const progress = useGameProgress(ctx);
  const recipes = content.items<Recipe>(RECIPE_CONTENT_TYPE) as Recipe[];
  const [level, setLevel] = useState<ChefLevel | null>(null);
  const [announce, setAnnounce] = useState<Recipe[]>([]);

  if (!level) {
    return (
      <GameScreen background="linear-gradient(180deg,#fff3e0,#ffe0b2)">
        <h2 className="subtitle" style={{ textAlign: 'center' }}>
          👩‍🍳 {t('mini-chef:choose')}
        </h2>
        {announce.length > 0 && (
          <div className="card row center anim-pulse" style={{ alignSelf: 'center' }} data-testid="chef-new-recipe">
            {announce.map((r) => (
              <span key={r.id} style={{ fontWeight: 800 }}>
                <span style={{ fontSize: '2rem' }}>{r.emoji}</span> {t('mini-chef:newRecipe', { name: loc(r.name, ctx.locale) })}
              </span>
            ))}
          </div>
        )}
        <LevelGrid
          minWidth={120}
          levels={LEVELS.map((l, i) => {
            const dishes = recipesForLevel(recipes, l.number);
            return {
              id: l.id,
              label: `${t('common.level')} ${l.number}`,
              icon: (
                <span style={{ fontSize: '1.6rem' }}>
                  {dishes
                    .slice(-3)
                    .map((d) => d.emoji)
                    .join('')}
                </span>
              ),
              stars: progress.levels[l.id]?.stars ?? 0,
              locked: i > 0 && !progress.levels[LEVELS[i - 1].id]?.completed && !progress.levels[l.id]?.completed,
            };
          })}
          onPick={(id) => {
            setAnnounce([]);
            setLevel(LEVELS.find((l) => l.id === id) ?? null);
          }}
        />
      </GameScreen>
    );
  }
  return (
    <Kitchen
      key={level.id}
      ctx={ctx}
      paused={paused}
      level={level}
      recipes={recipes}
      onDone={(completed) => {
        if (completed) {
          const next = LEVELS[LEVELS.indexOf(level) + 1];
          if (next) {
            const fresh = newRecipesAt(recipes, next.number);
            setAnnounce(fresh);
            if (fresh.length) void ctx.services.progress.saveData({ recipesUnlocked: recipesForLevel(recipes, next.number).map((r) => r.id) });
          }
        }
        setLevel(null);
      }}
    />
  );
}

function Kitchen({ ctx, paused, level, recipes, onDone }: { ctx: GameContext; paused: boolean; level: ChefLevel; recipes: Recipe[]; onDone: (completed: boolean) => void }) {
  const { t, audio } = ctx.services;
  const rng = useMemo(() => createRng(timeSeed()), []);
  const today = useMemo(() => recipesForLevel(recipes, level.number), [recipes, level]);
  const orders = useMemo(() => makeOrders(rng, today, level.customers), [rng, today, level]);
  const shelf = useMemo(
    () => buildShelf(rng, today, recipes, ctx.difficulty === 'easy' ? 0 : level.extraIngredients),
    [rng, today, recipes, level, ctx.difficulty],
  );
  const faces = useMemo(() => orders.map(() => pick(rng, CUSTOMERS)), [orders, rng]);
  const [index, setIndex] = useState(0);
  const [plate, setPlate] = useState<Ingredient[]>([]);
  const [mood, setMood] = useState<'waiting' | 'happy' | 'sad'>('waiting');
  const [message, setMessage] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [timeouts, setTimeouts] = useState(0);
  const [served, setServed] = useState(0);
  const [hintId, setHintId] = useState<string | null>(null);
  const [recipeVisible, setRecipeVisible] = useState(true);
  const [drag, setDrag] = useState<{ ing: Ingredient; x: number; y: number; pointer: number } | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  const timed = !!ctx.options.timed && ctx.ageGroup !== '4-6' && ctx.difficulty !== 'easy';
  const patienceMax = timed ? PATIENCE[ctx.difficulty] : 0;
  const [patience, setPatience] = useState<number>(patienceMax);
  const live = useRef({ served: 0, mistakes: 0, timeouts: 0, index: 0 });
  const order = orders[index];
  live.current = { served, mistakes, timeouts, index };
  const strict = ctx.difficulty === 'hard' || ctx.difficulty === 'expert';
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Hard mode: the recipe card is shown briefly, then hidden (memory challenge).
  useEffect(() => {
    setRecipeVisible(true);
    if (!strict) return;
    const id = window.setTimeout(() => setRecipeVisible(false), 4000);
    return () => window.clearTimeout(id);
  }, [index, strict]);

  useInterval(
    () => {
      setPatience((p) => p - 1);
    },
    timed && !paused && mood === 'waiting' ? 1000 : null,
  );
  useEffect(() => {
    if (timed && patience <= 0 && mood === 'waiting' && !busy.current) {
      busy.current = true;
      setTimeouts((n) => n + 1);
      setMood('sad');
      setMessage(t('mini-chef:tooSlow'));
      audio.play('error');
      later(() => nextCustomer(), 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patience]);

  const flash = (m: string, ms = 1500) => {
    setMessage(m);
    later(() => setMessage((cur) => (cur === m ? '' : cur)), ms);
  };

  const add = (ing: Ingredient) => {
    if (paused || busy.current || mood !== 'waiting') return;
    const ids = plate.map((p) => p.id);
    if (!strict && !isNextStep(order, ids, ing.id)) {
      // Easy/medium: gently reject and point to the right ingredient.
      audio.play('error');
      setMistakes((m) => m + 1);
      const st = validateAssembly(order, ids);
      const next = st.status === 'partial' ? st.next : null;
      if (next) {
        flash(t('mini-chef:notNext', { name: loc(next.name, ctx.locale) }));
        if (ctx.difficulty === 'easy') {
          setHintId(next.id);
          later(() => setHintId(null), 1500);
        }
      }
      return;
    }
    if (ids.length >= 8) return;
    audio.play('pop');
    setPlate([...plate, ing]);
  };

  const serve = () => {
    if (busy.current || mood !== 'waiting' || paused) return;
    const st = validateAssembly(
      order,
      plate.map((p) => p.id),
    );
    if (st.status !== 'complete') {
      audio.play('error');
      setMistakes((m) => m + 1);
      if (strict) {
        setMood('sad');
        flash(t('mini-chef:wrongDish'));
        setPlate([]);
        setRecipeVisible(true);
        later(() => setMood('waiting'), 1200);
      } else flash(t('mini-chef:oops'));
      return;
    }
    busy.current = true;
    audio.play('success');
    later(() => audio.play('coin'), 250);
    setMood('happy');
    setServed((s) => s + 1);
    setMessage(t('mini-chef:thanks'));
    later(() => nextCustomer(), 1300);
  };

  const nextCustomer = () => {
    // Read the latest counters (this runs from a timer scheduled during an earlier render).
    const { served: count, mistakes: m, timeouts: to, index: i } = live.current;
    if (i + 1 >= orders.length) {
      audio.play('win');
      ctx.reportResult({
        levelId: level.id,
        score: Math.max(0, count * 100 - m * 10),
        stars: chefStars(m, to),
        completed: count > 0,
        stats: { orders: count },
      });
      onDone(count > 0);
      return;
    }
    setIndex((i) => i + 1);
    setPlate([]);
    setMood('waiting');
    setMessage('');
    setPatience(patienceMax);
    busy.current = false;
  };

  // Drag & drop from the shelf onto the plate (tap also works).
  const startDrag = (e: RPointerEvent, ing: Ingredient) => {
    if (paused) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ ing, x: e.clientX, y: e.clientY, pointer: e.pointerId });
  };
  const moveDrag = (e: RPointerEvent) => {
    if (drag && drag.pointer === e.pointerId) setDrag({ ...drag, x: e.clientX, y: e.clientY });
  };
  const endDrag = (e: RPointerEvent, ing: Ingredient, startX: number, startY: number) => {
    if (!drag || drag.pointer !== e.pointerId) return;
    const r = plateRef.current?.getBoundingClientRect();
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY) > 12;
    const overPlate = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    setDrag(null);
    if (!moved || overPlate) add(ing);
  };
  const dragStart = useRef({ x: 0, y: 0 });

  const done = plate.length;
  return (
    <div className="chef-root" onPointerMove={moveDrag}>
      <div className="hud" style={{ padding: '6px 8px 0' }}>
        <span className="pill" data-testid="chef-progress">
          🧑‍🤝‍🧑 {index + 1}/{orders.length}
        </span>
        <span className="pill">😋 {served}</span>
        {timed && (
          <span className="chef-patience" aria-label="patience">
            <span style={{ width: `${(Math.max(0, patience) / Math.max(1, patienceMax)) * 100}%`, background: patience < patienceMax / 3 ? 'var(--danger)' : 'var(--success)' }} />
          </span>
        )}
      </div>

      <div className="chef-counter">
        <div className={`chef-customer ${mood}`} key={index}>
          <span className="chef-face">{mood === 'happy' ? '😋' : mood === 'sad' ? '😢' : faces[index]}</span>
          <div className="chef-bubble" data-testid="chef-order" data-recipe={order.id}>
            <span style={{ fontSize: '2.2rem' }}>{order.emoji}</span>
            <span>{t('mini-chef:order', { dish: loc(order.name, ctx.locale) })}</span>
          </div>
        </div>

        <div className={`chef-recipe ${recipeVisible ? '' : 'hidden'}`} aria-label={t('mini-chef:recipe')}>
          <strong>📖 {t('mini-chef:recipe')}</strong>
          <ol>
            {order.steps.map((s, i) => (
              <li key={i} className={i < done ? 'done' : i === done ? 'next' : ''}>
                <span>{recipeVisible || i < done ? s.emoji : '❓'}</span>
                <span className="small">{recipeVisible || i < done ? loc(s.name, ctx.locale) : ''}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="chef-plate-zone">
          <div ref={plateRef} className={`chef-plate ${drag ? 'drop-target' : ''}`} data-testid="chef-plate">
            {plate.length === 0 && <span className="muted small">{t('mini-chef:dropHere')}</span>}
            <div className="chef-stack">
              {plate.map((p, i) => (
                <span key={i} className="chef-stack-item" style={{ zIndex: i }}>
                  {p.emoji}
                </span>
              ))}
            </div>
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={() => setPlate([])} disabled={!plate.length} data-testid="chef-clear">
              🔄 {t('mini-chef:clear')}
            </button>
            <button className="btn btn-success" onClick={serve} disabled={!plate.length} data-testid="chef-serve">
              🛎️ {t('mini-chef:serve')}
            </button>
          </div>
        </div>
      </div>
      {message && (
        <div className="chef-toast pill" role="status">
          {message}
        </div>
      )}

      <div className="chef-shelf" data-testid="chef-shelf">
        {shelf.map((ing) => (
          <button
            key={ing.id}
            className={`chef-ingredient ${hintId === ing.id ? 'hint' : ''}`}
            onPointerDown={(e) => {
              dragStart.current = { x: e.clientX, y: e.clientY };
              startDrag(e, ing);
            }}
            onPointerUp={(e) => endDrag(e, ing, dragStart.current.x, dragStart.current.y)}
            onPointerCancel={() => setDrag(null)}
            aria-label={loc(ing.name, ctx.locale)}
            data-testid={`chef-ing-${ing.id}`}
          >
            <span className="chef-ing-emoji">{ing.emoji}</span>
            <span className="chef-ing-name">{loc(ing.name, ctx.locale)}</span>
          </button>
        ))}
      </div>
      {drag && (
        <span className="chef-drag" style={{ left: drag.x, top: drag.y }}>
          {drag.ing.emoji}
        </span>
      )}
    </div>
  );
}
