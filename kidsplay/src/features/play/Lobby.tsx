import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { registry } from '../../games';
import type { Difficulty, GameMode } from '../../core/game-engine/types';
import { recommendDifficulty } from '../../core/game-engine/difficulty';
import { results } from '../../core/storage/repositories';
import { audio } from '../../core/audio/audio';
import { Toggle, TopBar } from '../../shared/components/ui';
import { Avatar } from '../../shared/components/Avatar';
import { sanitizeNickname } from '../../core/storage/repositories';

const P2_COLORS = ['#ff7a59', '#7c5cff'];

export function Lobby({ gameId, versus }: { gameId: string; versus?: boolean }) {
  const { t } = useTranslation();
  const { profile, profiles, navigate, back } = useApp();
  const game = registry.get(gameId);
  const [difficulty, setDifficulty] = useState<Difficulty>(game?.difficulties[0] ?? 'easy');
  const [recommended, setRecommended] = useState<Difficulty | null>(null);
  const [mode, setMode] = useState<GameMode>(versus && game?.supportsVersus ? 'versus' : 'solo');
  const others = profiles.filter((p) => p.id !== profile?.id);
  const [p2, setP2] = useState(others[0]?.nickname ?? t('lobby.player2'));
  const [options, setOptions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((game?.options ?? []).map((o) => [o.id, o.default])),
  );

  useEffect(() => {
    if (!game || !profile) return;
    void results.forGame(profile.id, game.id).then((h) => {
      const rec = recommendDifficulty(profile.ageGroup, game.difficulties, h);
      setRecommended(rec);
      setDifficulty(rec);
    });
  }, [game, profile]);

  if (!game || !profile) return null;
  const visibleOptions = (game.options ?? []).filter((o) => !o.ageGroups || o.ageGroups.includes(profile.ageGroup));

  const start = () => {
    audio.unlock();
    audio.play('success');
    const players =
      mode === 'versus'
        ? [
            { name: profile.nickname, color: P2_COLORS[0], avatarCharacter: profile.avatar.character },
            { name: sanitizeNickname(p2) || t('lobby.player2'), color: P2_COLORS[1] },
          ]
        : [{ name: profile.nickname, color: P2_COLORS[0], avatarCharacter: profile.avatar.character }];
    navigate({ name: 'game', config: { gameId, difficulty, mode, players, options } }, { replace: true });
  };

  return (
    <div className="screen screen-mint scroll" data-testid={`lobby-${gameId}`}>
      <TopBar title={t(game.nameKey)} onBack={back} />
      <div className="col" style={{ maxWidth: 640, width: '100%', margin: '0 auto', gap: 16 }}>
        <div className="card row" style={{ gap: 16 }}>
          <span className="game-card-icon" style={{ background: game.color, fontSize: '3rem', width: 84, height: 84, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {game.icon}
          </span>
          <div className="col" style={{ gap: 4 }}>
            <strong style={{ fontSize: '1.2rem' }}>{t(game.descriptionKey)}</strong>
            <span className="muted small">
              📖 {t(`${game.id}:${mode === 'versus' ? 'rulesVs' : 'rules'}`, { ns: [game.id], defaultValue: t(`${game.id}:rules`) })}
            </span>
          </div>
        </div>

        {game.difficulties.length > 1 && (
          <div className="card col">
            <h2 className="subtitle">{t('lobby.difficulty')}</h2>
            <div className="segmented" role="radiogroup" aria-label={t('lobby.difficulty')}>
              {game.difficulties.map((d) => (
                <button
                  key={d}
                  role="radio"
                  aria-checked={difficulty === d}
                  className={`btn ${difficulty === d ? 'btn-secondary selected' : ''}`}
                  onClick={() => {
                    audio.play('tap');
                    setDifficulty(d);
                  }}
                  data-testid={`difficulty-${d}`}
                >
                  {t(`difficulty.${d}`)}
                  {recommended === d && ' 👍'}
                </button>
              ))}
            </div>
            {recommended && <span className="muted small">👍 = {t('lobby.recommended')}</span>}
          </div>
        )}

        {game.supportsVersus && (
          <div className="card col">
            <h2 className="subtitle">{t('lobby.mode')}</h2>
            <div className="segmented">
              {(['solo', 'versus'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  className={`btn ${mode === m ? 'btn-secondary selected' : ''}`}
                  onClick={() => {
                    audio.play('tap');
                    setMode(m);
                  }}
                  data-testid={`mode-${m}`}
                >
                  {m === 'solo' ? '🙂' : '👫'} {t(`lobby.${m}`)}
                </button>
              ))}
            </div>
            {mode === 'versus' && (
              <div className="col">
                <div className="row">
                  <Avatar avatar={profile.avatar} size={44} />
                  <strong style={{ color: P2_COLORS[0] }}>
                    {t('lobby.player1')}: {profile.nickname}
                  </strong>
                </div>
                <label className="row" style={{ fontWeight: 800, color: P2_COLORS[1] }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{t('lobby.player2')}:</span>
                  <input className="text-input" value={p2} maxLength={16} onChange={(e) => setP2(e.target.value)} data-testid="player2-name" />
                </label>
                {others.length > 0 && (
                  <div className="row wrap">
                    {others.map((o) => (
                      <button key={o.id} className="btn btn-sm" onClick={() => setP2(o.nickname)}>
                        <Avatar avatar={o.avatar} size={28} /> {o.nickname}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {visibleOptions.length > 0 && (
          <div className="card col">
            <h2 className="subtitle">{t('lobby.options')}</h2>
            {visibleOptions.map((o) => (
              <div key={o.id} className="row">
                <span className="grow" style={{ fontWeight: 700 }}>
                  {t(o.labelKey)}
                </span>
                <Toggle checked={!!options[o.id]} label={t(o.labelKey)} onChange={(v) => setOptions({ ...options, [o.id]: v })} />
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-big anim-pulse" onClick={start} data-testid="lobby-play">
          ▶️ {t('common.play')}
        </button>
      </div>
    </div>
  );
}
