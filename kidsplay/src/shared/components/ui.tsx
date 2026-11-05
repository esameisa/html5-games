import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { audio } from '../../core/audio/audio';

export function Stars({ count, max = 3, big, size }: { count: number; max?: number; big?: boolean; size?: string }) {
  return (
    <span className={`stars-row${big ? ' big' : ''}`} style={{ fontSize: size }} aria-label={`${count}/${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i < count ? ' on' : ''}`}>
          ⭐
        </span>
      ))}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      onClick={() => {
        audio.play('tap');
        onChange(!checked);
      }}
    />
  );
}

export function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose?: () => void; labelledBy?: string }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">{children}</div>
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="top-bar">
      {onBack ? (
        <button
          className="btn btn-round btn-ghost"
          aria-label={t('common.back')}
          onClick={() => {
            audio.play('tap');
            onBack();
          }}
        >
          <span className="flip-rtl">⬅️</span>
        </button>
      ) : (
        <span style={{ width: 56 }} />
      )}
      <h1 className="title">{title}</h1>
      {right ?? <span style={{ width: 56 }} />}
    </div>
  );
}

/** Lightweight canvas confetti burst. */
export function Confetti({ active, duration = 2600 }: { active: boolean; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#ff7a59', '#ffcd3c', '#7c5cff', '#36c46f', '#4fc3f7', '#ff8fab'];
    const parts = Array.from({ length: 140 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const fade = Math.max(0, 1 - (now - start) / duration);
      for (const p of parts) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      if (fade > 0) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, duration]);
  if (!active) return null;
  return <canvas ref={ref} className="confetti" style={{ width: '100%', height: '100%' }} aria-hidden />;
}

/** Simple confirm dialog. */
export function ConfirmDialog({ text, onYes, onNo, danger }: { text: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  const { t } = useTranslation();
  return (
    <Modal onClose={onNo}>
      <p className="subtitle" style={{ marginBottom: 20 }}>
        {text}
      </p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onNo}>
          {t('common.cancel')}
        </button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onYes}>
          {t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}

export function useInterval(fn: () => void, ms: number | null) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

/** Small helper to animate a CSS class once (e.g. shake on error). */
export function useFlash(ms = 450): [string | null, (cls: string) => void] {
  const [cls, setCls] = useState<string | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [
    cls,
    (c: string) => {
      setCls(c);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCls(null), ms);
    },
  ];
}
