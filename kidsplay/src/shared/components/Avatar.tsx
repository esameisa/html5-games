import type { AvatarConfig } from '../../core/storage/db';

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Ears({ character, color }: { character: string; color: string }) {
  const dark = shade(color, -40);
  switch (character) {
    case 'bunny':
      return (
        <g>
          <ellipse cx="36" cy="16" rx="8" ry="20" fill={color} transform="rotate(-10 36 16)" />
          <ellipse cx="64" cy="16" rx="8" ry="20" fill={color} transform="rotate(10 64 16)" />
          <ellipse cx="36" cy="18" rx="4" ry="13" fill="#ffd1dc" transform="rotate(-10 36 18)" />
          <ellipse cx="64" cy="18" rx="4" ry="13" fill="#ffd1dc" transform="rotate(10 64 18)" />
        </g>
      );
    case 'bear':
      return (
        <g>
          <circle cx="26" cy="30" r="11" fill={color} />
          <circle cx="74" cy="30" r="11" fill={color} />
          <circle cx="26" cy="30" r="5" fill={dark} />
          <circle cx="74" cy="30" r="5" fill={dark} />
        </g>
      );
    case 'panda':
      return (
        <g>
          <circle cx="26" cy="30" r="11" fill="#2b2d42" />
          <circle cx="74" cy="30" r="11" fill="#2b2d42" />
        </g>
      );
    case 'cat':
    case 'fox':
      return (
        <g>
          <path d="M20 42 L26 12 L44 30 Z" fill={color} />
          <path d="M80 42 L74 12 L56 30 Z" fill={color} />
          <path d="M25 34 L28 20 L37 30 Z" fill={character === 'fox' ? '#fff' : '#ffd1dc'} />
          <path d="M75 34 L72 20 L63 30 Z" fill={character === 'fox' ? '#fff' : '#ffd1dc'} />
        </g>
      );
    case 'owl':
      return (
        <g>
          <path d="M22 36 L24 16 L40 28 Z" fill={dark} />
          <path d="M78 36 L76 16 L60 28 Z" fill={dark} />
        </g>
      );
    case 'dino':
      return (
        <g fill={dark}>
          <path d="M40 22 L46 8 L52 22 Z" />
          <path d="M52 22 L58 10 L64 24 Z" />
          <path d="M30 26 L34 14 L42 24 Z" />
        </g>
      );
    case 'robot':
      return (
        <g>
          <rect x="48" y="8" width="4" height="14" fill="#90a4ae" />
          <circle cx="50" cy="8" r="5" fill="#ff5c7a" />
          <rect x="16" y="44" width="8" height="16" rx="3" fill="#90a4ae" />
          <rect x="76" y="44" width="8" height="16" rx="3" fill="#90a4ae" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ hat }: { hat: string }) {
  switch (hat) {
    case 'cap':
      return (
        <g>
          <path d="M28 30 Q50 6 72 30 Z" fill="#4fc3f7" />
          <path d="M66 28 Q84 26 88 32 L66 32 Z" fill="#0288d1" />
          <circle cx="50" cy="13" r="3" fill="#0288d1" />
        </g>
      );
    case 'bow':
      return (
        <g transform="translate(66 20)">
          <path d="M0 0 L-12 -8 L-12 8 Z M0 0 L12 -8 L12 8 Z" fill="#ff5c7a" />
          <circle r="4" fill="#e83e62" />
        </g>
      );
    case 'party':
      return (
        <g>
          <path d="M38 26 L50 -4 L62 26 Z" fill="#ffcd3c" />
          <path d="M42 18 L58 18 L56 12 L44 12 Z" fill="#ff7a59" />
          <circle cx="50" cy="-4" r="5" fill="#7c5cff" />
        </g>
      );
    case 'crown':
      return <path d="M32 28 L32 8 L41 18 L50 4 L59 18 L68 8 L68 28 Z" fill="#ffcd3c" stroke="#e6a800" strokeWidth="2" strokeLinejoin="round" />;
    case 'wizard':
      return (
        <g>
          <path d="M26 30 L52 -8 L74 30 Z" fill="#5a3fd8" />
          <ellipse cx="50" cy="30" rx="30" ry="6" fill="#7c5cff" />
          <text x="48" y="20" fontSize="12" textAnchor="middle">✦</text>
        </g>
      );
    case 'chef':
      return (
        <g fill="#fff" stroke="#ddd" strokeWidth="1.5">
          <rect x="34" y="18" width="32" height="12" rx="2" />
          <circle cx="38" cy="12" r="9" />
          <circle cx="50" cy="7" r="10" />
          <circle cx="62" cy="12" r="9" />
        </g>
      );
    default:
      return null;
  }
}

function Accessory({ acc, behind }: { acc: string; behind?: boolean }) {
  if (behind) return acc === 'cape' ? <path d="M22 66 L10 100 L90 100 L78 66 Z" fill="#e53935" /> : null;
  switch (acc) {
    case 'glasses':
      return (
        <g fill="rgba(255,255,255,0.35)" stroke="#2b2d42" strokeWidth="2.5">
          <circle cx="38" cy="50" r="8" />
          <circle cx="62" cy="50" r="8" />
          <path d="M46 50 L54 50" />
        </g>
      );
    case 'bowtie':
      return <path d="M50 80 L38 73 L38 87 Z M50 80 L62 73 L62 87 Z" fill="#7c5cff" />;
    case 'scarf':
      return (
        <g>
          <rect x="26" y="72" width="48" height="9" rx="4" fill="#ff7a59" />
          <rect x="60" y="76" width="9" height="18" rx="3" fill="#ff7a59" />
        </g>
      );
    case 'star':
      return <text x="66" y="94" fontSize="16">⭐</text>;
    default:
      return null;
  }
}

/** Original vector avatar. Pure SVG: crisp on high-DPI screens and fully offline. */
export function Avatar({ avatar, size = 72, className, title }: { avatar: AvatarConfig; size?: number; className?: string; title?: string }) {
  const { character, color, hat, accessory } = avatar;
  const face = character === 'panda' ? '#fff' : color;
  const muzzle = character === 'robot' ? '#cfd8dc' : shade(color, 45);
  return (
    <svg viewBox="-4 -10 108 112" width={size} height={size} className={className} role="img" aria-label={title ?? character}>
      <Accessory acc={accessory} behind />
      <ellipse cx="50" cy="92" rx="26" ry="14" fill={character === 'panda' ? '#2b2d42' : shade(color, -15)} />
      <Ears character={character} color={color} />
      {character === 'robot' ? (
        <rect x="20" y="24" width="60" height="56" rx="16" fill={face} stroke={shade(color, -40)} strokeWidth="3" />
      ) : (
        <circle cx="50" cy="52" r="31" fill={face} />
      )}
      {character === 'panda' && (
        <g fill="#2b2d42">
          <ellipse cx="38" cy="50" rx="8" ry="10" transform="rotate(-20 38 50)" />
          <ellipse cx="62" cy="50" rx="8" ry="10" transform="rotate(20 62 50)" />
        </g>
      )}
      {character === 'owl' && (
        <g fill="#fff">
          <circle cx="38" cy="48" r="11" />
          <circle cx="62" cy="48" r="11" />
        </g>
      )}
      <ellipse cx="50" cy="63" rx="15" ry="11" fill={character === 'panda' ? '#f1f1f1' : muzzle} />
      <circle cx="38" cy="49" r="4.5" fill={character === 'panda' ? '#fff' : '#2b2d42'} />
      <circle cx="62" cy="49" r="4.5" fill={character === 'panda' ? '#fff' : '#2b2d42'} />
      <circle cx="39.5" cy="47.5" r="1.6" fill={character === 'panda' ? '#2b2d42' : '#fff'} />
      <circle cx="63.5" cy="47.5" r="1.6" fill={character === 'panda' ? '#2b2d42' : '#fff'} />
      {character === 'owl' ? (
        <path d="M45 58 L55 58 L50 66 Z" fill="#ffb74d" />
      ) : (
        <ellipse cx="50" cy="58" rx="4" ry="3" fill="#2b2d42" />
      )}
      <path d="M43 65 Q50 71 57 65" stroke="#2b2d42" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="62" r="5" fill="#ff8fab" opacity="0.55" />
      <circle cx="72" cy="62" r="5" fill="#ff8fab" opacity="0.55" />
      <Accessory acc={accessory} />
      <Hat hat={hat} />
    </svg>
  );
}

export const DEFAULT_AVATAR: AvatarConfig = { character: 'bunny', color: '#ff8fab', hat: 'none', accessory: 'none' };
