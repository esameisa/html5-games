import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ReactGameProps } from '../../core/game-engine/reactGame';
import type { GameContext } from '../../core/game-engine/types';
import { COLORING_CONTENT_TYPE, type Artwork, type ColoringTemplate } from './content';
import { floodFill, hexToRgba, History } from './fill';
import { loc } from '../../shared/utils/text';
import { GameScreen } from '../../shared/components/gameUi';
import { uid } from '../../core/storage/repositories';
import './color.css';

const PALETTE = ['#e53935', '#ff7043', '#ffb300', '#fdd835', '#c0ca33', '#43a047', '#00897b', '#29b6f6', '#1e88e5', '#3949ab', '#8e24aa', '#ec407a', '#f8bbd0', '#8d6e63', '#ffffff', '#212121'];
const STICKERS = ['⭐', '❤️', '🌈', '🦋', '🌸', '🐱', '🐶', '🚀', '☀️', '🌙', '🎈', '🍭', '👑', '🐞', '🍀', '🦄'];
const SIZES = [0.008, 0.016, 0.03, 0.05];
const BLANK = 'blank';

type Tool = 'fill' | 'brush' | 'eraser' | 'sticker';
type Phase = { kind: 'select' } | { kind: 'gallery' } | { kind: 'draw'; template: ColoringTemplate | null; artwork?: Artwork };

export default function ColorSplash({ ctx }: ReactGameProps) {
  const { t, content, storage } = ctx.services;
  const templates = content.items<ColoringTemplate>(COLORING_CONTENT_TYPE) as ColoringTemplate[];
  const [phase, setPhase] = useState<Phase>({ kind: 'select' });
  const [gallery, setGallery] = useState<Artwork[]>([]);
  const [theme, setTheme] = useState('all');
  const reloadGallery = useCallback(() => void storage.list<Artwork>('artworks').then(setGallery), [storage]);
  useEffect(reloadGallery, [reloadGallery]);

  if (phase.kind === 'draw') {
    return (
      <Canvas
        key={phase.artwork?.id ?? phase.template?.id ?? BLANK}
        ctx={ctx}
        template={phase.template}
        artwork={phase.artwork}
        onClose={() => {
          reloadGallery();
          setPhase({ kind: 'select' });
        }}
      />
    );
  }

  if (phase.kind === 'gallery') {
    return (
      <GameScreen background="linear-gradient(180deg,#fff8e1,#fce4ec)">
        <div className="row">
          <button className="btn btn-sm" onClick={() => setPhase({ kind: 'select' })}>
            <span className="flip-rtl">⬅️</span>
          </button>
          <h2 className="subtitle">🖼️ {t('color-splash:gallery')}</h2>
        </div>
        {gallery.length === 0 && <p className="muted subtitle" style={{ textAlign: 'center' }}>{t('color-splash:emptyGallery')}</p>}
        <div className="grid-tiles" data-testid="cs-gallery">
          {gallery.map((a) => (
            <div key={a.id} className="tile" data-testid="cs-artwork">
              <img src={a.preview} alt="" style={{ width: 120, height: 120, borderRadius: 12, background: '#fff' }} />
              <div className="row">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setPhase({ kind: 'draw', template: templates.find((tp) => tp.id === a.templateId) ?? null, artwork: a })}
                  data-testid="cs-open"
                >
                  ✏️ {t('color-splash:open')}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  aria-label={t('common.delete')}
                  onClick={async () => {
                    await storage.remove('artworks', a.id);
                    reloadGallery();
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </GameScreen>
    );
  }

  const themes = ['all', ...new Set(templates.map((tp) => tp.theme))];
  return (
    <GameScreen background="linear-gradient(180deg,#fff8e1,#fce4ec)">
      <h2 className="subtitle" style={{ textAlign: 'center' }}>
        🎨 {t('color-splash:choose')}
      </h2>
      <div className="row center wrap">
        <button className="btn btn-secondary" onClick={() => setPhase({ kind: 'draw', template: null })} data-testid="cs-free">
          ✏️ {t('color-splash:freeDraw')}
        </button>
        <button className="btn" onClick={() => setPhase({ kind: 'gallery' })} data-testid="cs-gallery-btn">
          🖼️ {t('color-splash:gallery')} ({gallery.length})
        </button>
      </div>
      <div className="segmented" style={{ justifyContent: 'center' }}>
        {themes.map((th) => (
          <button key={th} className={`btn btn-sm ${theme === th ? 'btn-secondary' : ''}`} onClick={() => setTheme(th)}>
            {th === 'all' ? '✨' : t(`color-splash:theme.${th}`, { defaultValue: th })}
          </button>
        ))}
      </div>
      <div className="grid-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {templates
          .filter((tp) => theme === 'all' || tp.theme === theme)
          .map((tp) => (
            <button key={tp.id} className="tile" onClick={() => setPhase({ kind: 'draw', template: tp })} data-testid={`cs-template-${tp.id}`}>
              <img src={content.assetUrl(tp.packId, tp.image)} alt="" style={{ width: 96, height: 96 }} />
              <span>{loc(tp.title, ctx.locale)}</span>
            </button>
          ))}
      </div>
    </GameScreen>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function Canvas({ ctx, template, artwork, onClose }: { ctx: GameContext; template: ColoringTemplate | null; artwork?: Artwork; onClose: () => void }) {
  const { t, audio, content, storage } = ctx.services;
  const wrapRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const outlineData = useRef<Uint8ClampedArray | null>(null);
  const history = useRef(new History<ImageData>(12));
  const stroke = useRef<{ id: number; last: [number, number]; mid: [number, number] } | null>(null);
  const savedId = useRef<string>(artwork?.id ?? uid('art_'));
  const reported = useRef(!!artwork);
  const [res, setRes] = useState(0);
  const [cssSize, setCssSize] = useState(0);
  const [landscape, setLandscape] = useState(true);
  const [tool, setTool] = useState<Tool>('fill');
  const [color, setColor] = useState(PALETTE[2]);
  const [size, setSize] = useState(1);
  const [sticker, setSticker] = useState(STICKERS[0]);
  const [, bump] = useState(0);
  const [toast, setToast] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  // Choose a fixed internal resolution once, based on CSS size × devicePixelRatio (sharp on HiDPI).
  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const measure = () => {
      const tb = 120;
      const isLand = el.clientWidth > el.clientHeight;
      const s = Math.floor(Math.max(120, isLand ? Math.min(el.clientHeight - 8, el.clientWidth - tb * 2.2) : Math.min(el.clientWidth - 8, el.clientHeight - tb * 2.2)));
      setLandscape(isLand);
      setCssSize(s);
      setRes((r) => r || Math.max(768, Math.min(1400, Math.round(s * Math.min(3, window.devicePixelRatio || 1)))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!res) return;
    let cancelled = false;
    void (async () => {
      const line = lineRef.current!.getContext('2d', { willReadFrequently: true })!;
      const paint = paintRef.current!.getContext('2d', { willReadFrequently: true })!;
      line.clearRect(0, 0, res, res);
      if (template) {
        try {
          const img = await loadImage(content.assetUrl(template.packId, template.image));
          if (cancelled) return;
          line.drawImage(img, 0, 0, res, res);
        } catch (e) {
          console.warn(e);
        }
      }
      outlineData.current = template ? line.getImageData(0, 0, res, res).data : null;
      if (artwork) {
        const img = await loadImage(artwork.paint);
        if (cancelled) return;
        paint.drawImage(img, 0, 0, res, res);
      }
      bump((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [res, template, artwork, content]);

  const pctx = () => paintRef.current!.getContext('2d', { willReadFrequently: true })!;
  const snapshot = () => {
    history.current.push(pctx().getImageData(0, 0, res, res));
    bump((n) => n + 1);
  };
  const toCanvas = (e: RPointerEvent): [number, number] => {
    const r = paintRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * res, ((e.clientY - r.top) / r.height) * res];
  };
  const brushPx = () => SIZES[size] * res;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (stroke.current || !res) return;
    e.preventDefault();
    const [x, y] = toCanvas(e);
    const c = pctx();
    if (tool === 'fill') {
      const img = c.getImageData(0, 0, res, res);
      const before = history.current;
      const copy = new ImageData(new Uint8ClampedArray(img.data), res, res);
      const changed = floodFill(img.data, outlineData.current, res, res, x, y, hexToRgba(color));
      if (changed > 0) {
        before.push(copy);
        c.putImageData(img, 0, 0);
        audio.play('pop');
        bump((n) => n + 1);
      }
      return;
    }
    if (tool === 'sticker') {
      snapshot();
      const s = res * 0.1;
      c.save();
      c.globalCompositeOperation = 'source-over';
      c.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(sticker, x, y);
      c.restore();
      audio.play('pop');
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    snapshot();
    stroke.current = { id: e.pointerId, last: [x, y], mid: [x, y] };
    c.save();
    c.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, brushPx() / 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = stroke.current;
    if (!s || s.id !== e.pointerId) return;
    const [x, y] = toCanvas(e);
    const mid: [number, number] = [(s.last[0] + x) / 2, (s.last[1] + y) / 2];
    const c = pctx();
    c.save();
    c.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    c.strokeStyle = color;
    c.lineWidth = brushPx();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(s.mid[0], s.mid[1]);
    c.quadraticCurveTo(s.last[0], s.last[1], mid[0], mid[1]);
    c.stroke();
    c.restore();
    s.last = [x, y];
    s.mid = mid;
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (stroke.current?.id === e.pointerId) stroke.current = null;
  };

  const undo = () => {
    const prev = history.current.undo(pctx().getImageData(0, 0, res, res));
    if (prev) pctx().putImageData(prev, 0, 0);
    audio.play('tap');
    bump((n) => n + 1);
  };
  const redo = () => {
    const next = history.current.redo(pctx().getImageData(0, 0, res, res));
    if (next) pctx().putImageData(next, 0, 0);
    audio.play('tap');
    bump((n) => n + 1);
  };
  const clear = () => {
    snapshot();
    pctx().clearRect(0, 0, res, res);
    setConfirmClear(false);
    audio.play('whoosh');
  };

  const save = async () => {
    const paint = paintRef.current!;
    const composite = document.createElement('canvas');
    composite.width = composite.height = 256;
    const cc = composite.getContext('2d')!;
    cc.fillStyle = '#fff';
    cc.fillRect(0, 0, 256, 256);
    cc.drawImage(paint, 0, 0, 256, 256);
    cc.drawImage(lineRef.current!, 0, 0, 256, 256);
    const now = new Date().toISOString();
    const art: Artwork = {
      id: savedId.current,
      templateId: template?.id ?? BLANK,
      templatePack: template?.packId,
      createdAt: artwork?.createdAt ?? now,
      updatedAt: now,
      width: res,
      height: res,
      paint: paint.toDataURL('image/png'),
      preview: composite.toDataURL('image/png'),
    };
    try {
      await storage.put('artworks', art);
      audio.play('success');
      setToast(t('color-splash:saved'));
      window.setTimeout(() => setToast(''), 1800);
      if (!reported.current) {
        reported.current = true;
        ctx.reportResult({ levelId: art.templateId, score: 100, stars: 3, completed: true, stats: { artworks: 1 } });
      }
    } catch (e) {
      audio.play('error');
      setToast(String((e as Error).message));
    }
  };

  const tools: [Tool, string][] = [
    ['fill', '🪣'],
    ['brush', '🖌️'],
    ['eraser', '🧽'],
    ['sticker', '⭐'],
  ];

  return (
    <div className={`cs-root ${landscape ? 'land' : 'port'}`} ref={wrapRef}>
      <div className="cs-side">
        <button className="btn btn-sm" onClick={onClose} aria-label={t('common.back')} data-testid="cs-back">
          <span className="flip-rtl">⬅️</span>
        </button>
        {tools.map(([id, icon]) => (
          <button
            key={id}
            className={`btn btn-sm cs-tool ${tool === id ? 'btn-secondary' : ''}`}
            onClick={() => {
              audio.play('tap');
              setTool(id);
            }}
            aria-label={t(`color-splash:${id}`)}
            aria-pressed={tool === id}
            data-testid={`cs-tool-${id}`}
          >
            {icon}
          </button>
        ))}
        <button className="btn btn-sm" onClick={undo} disabled={!history.current.canUndo} aria-label={t('color-splash:undo')} data-testid="cs-undo">
          ↩️
        </button>
        <button className="btn btn-sm" onClick={redo} disabled={!history.current.canRedo} aria-label={t('color-splash:redo')} data-testid="cs-redo">
          ↪️
        </button>
        <button className="btn btn-sm" onClick={() => setConfirmClear(true)} aria-label={t('color-splash:clear')}>
          🗑️
        </button>
        <button className="btn btn-sm btn-success" onClick={() => void save()} aria-label={t('color-splash:save')} data-testid="cs-save">
          💾
        </button>
      </div>
      <div className="cs-stage">
        <div className="cs-paper" style={{ width: cssSize, height: cssSize }}>
          <canvas ref={paintRef} width={res || 1} height={res || 1} className="cs-canvas" data-testid="cs-paint" />
          <canvas ref={lineRef} width={res || 1} height={res || 1} className="cs-canvas cs-lines" />
          <div
            className={`cs-events tool-${tool}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            data-testid="cs-surface"
          />
        </div>
        {toast && (
          <div className="cs-toast pill" role="status">
            {toast}
          </div>
        )}
      </div>
      <div className="cs-side cs-colors">
        {tool === 'sticker'
          ? STICKERS.map((s) => (
              <button key={s} className={`btn btn-sm cs-swatch ${sticker === s ? 'selected' : ''}`} onClick={() => setSticker(s)} style={{ fontSize: '1.4rem' }}>
                {s}
              </button>
            ))
          : PALETTE.map((c) => (
              <button
                key={c}
                className={`cs-swatch cs-color ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                aria-label={c}
                onClick={() => {
                  audio.play('tap');
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                data-testid={`cs-color-${c.slice(1)}`}
              />
            ))}
        {(tool === 'brush' || tool === 'eraser') && (
          <div className="cs-sizes" aria-label={t('color-splash:size')}>
            {SIZES.map((_, i) => (
              <button key={i} className={`btn btn-sm ${size === i ? 'btn-secondary' : ''}`} onClick={() => setSize(i)} aria-label={`${t('color-splash:size')} ${i + 1}`}>
                <span style={{ width: 6 + i * 6, height: 6 + i * 6, borderRadius: '50%', background: 'currentColor', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
      </div>
      {confirmClear && (
        <div className="overlay">
          <div className="modal col" style={{ textAlign: 'center' }}>
            <p className="subtitle">{t('color-splash:confirmClear')}</p>
            <div className="row center">
              <button className="btn" onClick={() => setConfirmClear(false)}>
                {t('common.no')}
              </button>
              <button className="btn btn-danger" onClick={clear}>
                {t('common.yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
