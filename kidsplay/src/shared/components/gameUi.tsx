import type { ReactNode } from 'react';
import type { PlayerInfo } from '../../core/game-engine/types';
import { Stars } from './ui';
import { audio } from '../../core/audio/audio';

export interface LevelTileData {
  id: string;
  label: string;
  icon?: ReactNode;
  stars: number;
  locked?: boolean;
  completed?: boolean;
  color?: string;
}

export function LevelGrid({ levels, onPick, minWidth = 130 }: { levels: LevelTileData[]; onPick: (id: string) => void; minWidth?: number }) {
  return (
    <div className="grid-tiles" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
      {levels.map((l) => (
        <button
          key={l.id}
          className={`tile${l.locked ? ' locked' : ''}`}
          disabled={l.locked}
          style={l.color ? { background: `linear-gradient(180deg, #fff 40%, ${l.color}33)` } : undefined}
          onClick={() => {
            audio.play('tap');
            onPick(l.id);
          }}
          data-testid={`level-${l.id}`}
        >
          <span className="tile-icon">{l.locked ? '🔒' : l.icon}</span>
          <span>{l.label}</span>
          <Stars count={l.stars} />
        </button>
      ))}
    </div>
  );
}

export function PlayerScores({ players, scores, current }: { players: PlayerInfo[]; scores: number[]; current?: number }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
      {players.map((p, i) => (
        <div
          key={i}
          className="pill"
          data-testid={`player-score-${i}`}
          style={{
            background: p.color,
            color: '#fff',
            transform: current === i ? 'scale(1.12)' : 'scale(0.95)',
            opacity: current === undefined || current === i ? 1 : 0.65,
            transition: 'transform 0.2s, opacity 0.2s',
            boxShadow: current === i ? '0 0 0 4px #fff, var(--shadow-sm)' : undefined,
          }}
        >
          {current === i ? '👉 ' : ''}
          {p.name}: {scores[i]}
        </div>
      ))}
    </div>
  );
}

export function GameScreen({ children, background }: { children: ReactNode; background?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 12px 12px',
        gap: 10,
        overflowY: 'auto',
        background,
      }}
    >
      {children}
    </div>
  );
}
