import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorldAreaId } from '../../core/game-engine/types';
import type { AvatarConfig } from '../../core/storage/db';
import { Avatar } from '../../shared/components/Avatar';

interface IslandPos {
  x: number;
  y: number;
  s: number;
}

const LANDSCAPE: Record<WorldAreaId, IslandPos> = {
  creative: { x: 260, y: 300, s: 1 },
  brain: { x: 800, y: 230, s: 1.12 },
  adventure: { x: 1340, y: 310, s: 1 },
  cooking: { x: 470, y: 660, s: 1 },
  party: { x: 1120, y: 670, s: 1.05 },
};
const PORTRAIT: Record<WorldAreaId, IslandPos> = {
  brain: { x: 450, y: 290, s: 1.05 },
  creative: { x: 220, y: 650, s: 0.92 },
  adventure: { x: 680, y: 760, s: 0.92 },
  cooking: { x: 240, y: 1120, s: 0.92 },
  party: { x: 660, y: 1290, s: 0.95 },
};
const BRIDGES: [WorldAreaId, WorldAreaId][] = [
  ['creative', 'brain'],
  ['brain', 'adventure'],
  ['creative', 'cooking'],
  ['cooking', 'party'],
  ['adventure', 'party'],
];

function Building({ area }: { area: WorldAreaId }) {
  switch (area) {
    case 'creative':
      return (
        <g>
          {['#ff5c7a', '#ffb74d', '#ffe066', '#7ed957', '#4fc3f7', '#9575cd'].map((c, i) => (
            <path key={c} d={`M ${-95 + i * 9} 0 A ${95 - i * 9} ${95 - i * 9} 0 0 1 ${95 - i * 9} 0`} stroke={c} strokeWidth="9" fill="none" />
          ))}
          <rect x="-30" y="-70" width="60" height="70" rx="8" fill="#fff4e0" stroke="#e8b26a" strokeWidth="4" />
          <path d="M-40 -70 L0 -110 L40 -70 Z" fill="#ff7a59" />
          <circle cx="0" cy="-40" r="12" fill="#7ec8ff" stroke="#fff" strokeWidth="3" />
          <g className="wm-spin-slow" style={{ transformOrigin: '60px -30px' }}>
            <ellipse cx="60" cy="-30" rx="26" ry="18" fill="#ffe0b2" stroke="#d7a86e" strokeWidth="3" />
            <circle cx="52" cy="-36" r="5" fill="#ff5c7a" />
            <circle cx="64" cy="-38" r="5" fill="#4fc3f7" />
            <circle cx="72" cy="-28" r="5" fill="#7ed957" />
          </g>
        </g>
      );
    case 'brain':
      return (
        <g>
          <rect x="-80" y="-80" width="160" height="80" rx="6" fill="#ede7ff" stroke="#9c88ff" strokeWidth="4" />
          <path d="M-90 -80 L0 -125 L90 -80 Z" fill="#7c5cff" />
          <circle cx="0" cy="-138" r="22" fill="#ffcd3c" stroke="#fff" strokeWidth="4" className="wm-pulse" />
          <text x="0" y="-130" textAnchor="middle" fontSize="22">💡</text>
          {[-55, -20, 15, 50].map((x) => (
            <rect key={x} x={x} y="-62" width="18" height="62" fill="#fff" stroke="#c5b8ff" strokeWidth="3" />
          ))}
          <text x="-60" y="-90" fontSize="26">📚</text>
          <text x="40" y="-90" fontSize="26">🧩</text>
        </g>
      );
    case 'adventure':
      return (
        <g>
          <rect x="30" y="-90" width="24" height="90" fill="#6ec6ff" opacity="0.85" />
          <path d="M30 -90 L54 -90 L54 0 L30 0 Z" fill="none" stroke="#e1f5fe" strokeWidth="4" strokeDasharray="8 10" className="wm-flow" />
          <rect x="20" y="-110" width="44" height="26" rx="10" fill="#8d6e63" />
          {[
            [-70, -10, 1.1],
            [-30, -30, 1.3],
            [80, -20, 1],
          ].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`} className="wm-sway" style={{ transformOrigin: `${x}px ${y}px` }}>
              <rect x="-6" y="-10" width="12" height="40" fill="#8d6e63" />
              <circle cx="0" cy="-30" r="30" fill="#43a047" />
              <circle cx="-16" cy="-16" r="18" fill="#66bb6a" />
              <circle cx="16" cy="-18" r="18" fill="#2e7d32" />
            </g>
          ))}
          <text x="-15" y="-5" fontSize="30">🗝️</text>
        </g>
      );
    case 'cooking':
      return (
        <g>
          <rect x="-70" y="-75" width="140" height="75" rx="8" fill="#fff3e0" stroke="#ffb74d" strokeWidth="4" />
          <path d="M-82 -75 L0 -118 L82 -75 Z" fill="#ff7043" />
          <rect x="40" y="-120" width="18" height="34" fill="#8d6e63" />
          <g className="wm-steam">
            <circle cx="49" cy="-130" r="9" fill="#fff" opacity="0.8" />
            <circle cx="56" cy="-148" r="11" fill="#fff" opacity="0.6" />
            <circle cx="46" cy="-168" r="13" fill="#fff" opacity="0.4" />
          </g>
          <rect x="-20" y="-45" width="40" height="45" rx="20" fill="#a1887f" />
          <rect x="-58" y="-60" width="26" height="22" fill="#ffe082" stroke="#fff" strokeWidth="3" />
          <rect x="32" y="-60" width="26" height="22" fill="#ffe082" stroke="#fff" strokeWidth="3" />
          <path d="M-74 -75 h148" stroke="#fff" strokeWidth="6" strokeDasharray="12 12" />
          <text x="-14" y="-82" fontSize="26">🍕</text>
        </g>
      );
    case 'party':
      return (
        <g>
          <path d="M-90 0 L-90 -60 Q0 -150 90 -60 L90 0 Z" fill="#ffecb3" stroke="#ffb300" strokeWidth="4" />
          {[-60, -20, 20, 60].map((x, i) => (
            <path key={x} d={`M${x - 20} -60 L${x} -${100 - Math.abs(x) / 3} L${x + 20} -60 Z`} fill={['#ff5c7a', '#7c5cff', '#36c46f', '#4fc3f7'][i]} opacity="0.85" />
          ))}
          <rect x="-25" y="-40" width="50" height="40" rx="25" fill="#7c5cff" />
          {[
            [-80, -130, '#ff5c7a'],
            [-55, -150, '#ffcd3c'],
            [70, -140, '#4fc3f7'],
          ].map(([x, y, c], i) => (
            <g key={i} className="wm-balloon" style={{ animationDelay: `${i * 0.6}s` }}>
              <path d={`M${x} ${Number(y) + 22} q 6 20 0 40`} stroke="#999" strokeWidth="2" fill="none" />
              <ellipse cx={x} cy={y} rx="16" ry="20" fill={String(c)} />
            </g>
          ))}
        </g>
      );
  }
}

function Island({ area, pos, label, onTap, badge }: { area: WorldAreaId; pos: IslandPos; label: string; onTap: () => void; badge?: ReactNode }) {
  const grass = { creative: '#9be15d', brain: '#7ed957', adventure: '#4caf50', cooking: '#aed581', party: '#81c784' }[area];
  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) scale(${pos.s})`}
      className="island"
      role="button"
      tabIndex={0}
      aria-label={label}
      data-testid={`island-${area}`}
      onClick={onTap}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap()}
    >
      <g className="island-float" style={{ animationDelay: `${(pos.x % 7) * 0.3}s` }}>
        <ellipse cx="0" cy="55" rx="150" ry="22" fill="rgba(0,40,80,0.12)" className="island-shadow" />
        <path d="M-150 0 Q-140 120 0 150 Q140 120 150 0 Z" fill="#a1785c" />
        <path d="M-120 30 Q-80 110 0 128 Q60 112 100 40 Z" fill="#8d6248" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="150" ry="42" fill={grass} />
        <ellipse cx="-20" cy="-6" rx="110" ry="26" fill="#ffffff" opacity="0.15" />
        <g transform="translate(0 6)">
          <Building area={area} />
        </g>
        <g transform="translate(0 92)">
          <rect x="-110" y="-24" width="220" height="48" rx="24" fill="#fff" stroke={grass} strokeWidth="4" />
          <text x="0" y="9" textAnchor="middle" fontSize="26" fontWeight="900" fill="#2b2d42">
            {label}
          </text>
        </g>
        {badge}
      </g>
    </g>
  );
}

export function WorldMap({
  portrait,
  labels,
  onArea,
  avatar,
  avatarArea,
  areaStars,
}: {
  portrait: boolean;
  labels: Record<WorldAreaId, string>;
  onArea: (a: WorldAreaId) => void;
  avatar: AvatarConfig;
  avatarArea: WorldAreaId;
  areaStars: Record<WorldAreaId, number>;
}) {
  const { i18n } = useTranslation();
  const layout = portrait ? PORTRAIT : LANDSCAPE;
  const [w, h] = portrait ? [900, 1600] : [1600, 900];
  const [stars] = useState(() => Array.from({ length: 26 }, () => [Math.random() * w, Math.random() * h * 0.5, Math.random() * 3 + 1]));
  const av = layout[avatarArea];
  const [hop, setHop] = useState(false);
  useEffect(() => {
    setHop(true);
    const id = setTimeout(() => setHop(false), 600);
    return () => clearTimeout(id);
  }, [avatarArea]);
  // Mirror the map in RTL so reading order matches the language.
  const mirror = i18n.dir() === 'rtl';
  const pos = (a: WorldAreaId): IslandPos => (mirror ? { ...layout[a], x: w - layout[a].x } : layout[a]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className="world-svg" data-testid="world-map">
      <defs>
        <linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ec8ff" />
          <stop offset="0.6" stopColor="#bfe8ff" />
          <stop offset="1" stopColor="#e6f7ff" />
        </linearGradient>
        <radialGradient id="wm-sun">
          <stop offset="0" stopColor="#fff9c4" />
          <stop offset="1" stopColor="#ffd54f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="url(#wm-sky)" />
      <circle cx={mirror ? 120 : w - 120} cy="110" r="150" fill="url(#wm-sun)" />
      <circle cx={mirror ? 120 : w - 120} cy="110" r="55" fill="#ffe066" />
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" className="wm-twinkle" style={{ animationDelay: `${(i % 9) * 0.4}s` }} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className="wm-cloud" style={{ animationDuration: `${50 + i * 15}s`, animationDelay: `${-i * 14}s` }}>
          <g transform={`translate(0 ${80 + i * (h / 5)})`} opacity="0.9">
            <ellipse cx="0" cy="0" rx="70" ry="28" fill="#fff" />
            <ellipse cx="40" cy="-18" rx="45" ry="30" fill="#fff" />
            <ellipse cx="-35" cy="-10" rx="35" ry="22" fill="#fff" />
          </g>
        </g>
      ))}
      {BRIDGES.map(([a, b]) => {
        const p = pos(a);
        const q = pos(b);
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2 + 60;
        return (
          <g key={a + b}>
            <path d={`M${p.x} ${p.y + 20} Q${mx} ${my} ${q.x} ${q.y + 20}`} stroke="#a1785c" strokeWidth="18" fill="none" strokeLinecap="round" opacity="0.8" />
            <path d={`M${p.x} ${p.y + 20} Q${mx} ${my} ${q.x} ${q.y + 20}`} stroke="#ffe0b2" strokeWidth="8" strokeDasharray="14 12" fill="none" />
          </g>
        );
      })}
      {(Object.keys(layout) as WorldAreaId[]).map((a) => (
        <Island
          key={a}
          area={a}
          pos={pos(a)}
          label={labels[a]}
          onTap={() => onArea(a)}
          badge={
            areaStars[a] > 0 ? (
              <g transform="translate(110 -60)">
                <circle r="30" fill="#fff" stroke="#ffcd3c" strokeWidth="4" />
                <text y="-2" textAnchor="middle" fontSize="20">⭐</text>
                <text y="20" textAnchor="middle" fontSize="16" fontWeight="900" fill="#2b2d42">
                  {areaStars[a]}
                </text>
              </g>
            ) : null
          }
        />
      ))}
      <g
        style={{ transition: 'transform 0.6s cubic-bezier(0.3,1.3,0.5,1)', transform: `translate(${(mirror ? w - av.x : av.x) - 150}px, ${av.y - 150}px)` }}
        pointerEvents="none"
      >
        <g className={hop ? 'wm-hop' : 'wm-idle'}>
          <svg x="0" y="0" width="100" height="100" overflow="visible">
            <Avatar avatar={avatar} size={100} />
          </svg>
        </g>
      </g>
    </svg>
  );
}
