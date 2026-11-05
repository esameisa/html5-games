import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { registry } from '../../games';
import type { GameProgress, WorldAreaId } from '../../core/game-engine/types';
import { progress as progressRepo } from '../../core/storage/repositories';
import { levelProgress } from '../../core/rewards/rewards';
import { audio } from '../../core/audio/audio';
import { Avatar } from '../../shared/components/Avatar';
import { Stars } from '../../shared/components/ui';
import { ParentalGate } from '../../shared/components/ParentalGate';
import { WorldMap } from './WorldMap';
import './world.css';

const AREAS: WorldAreaId[] = ['creative', 'brain', 'adventure', 'cooking', 'party'];

function usePortrait() {
  const get = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.05;
  const [p, setP] = useState(get);
  useEffect(() => {
    const on = () => setP(get());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return p;
}

export function WorldScreen({ area }: { area?: WorldAreaId }) {
  const { t } = useTranslation();
  const { profile, navigate } = useApp();
  const portrait = usePortrait();
  const [all, setAll] = useState<GameProgress[]>([]);
  const [gate, setGate] = useState(false);
  const [lastArea, setLastArea] = useState<WorldAreaId>(area ?? 'brain');

  useEffect(() => {
    if (profile) void progressRepo.allForProfile(profile.id).then(setAll);
  }, [profile]);

  const starsByGame = useMemo(() => {
    const m: Record<string, { stars: number; done: number }> = {};
    for (const p of all) {
      const lv = Object.values(p.levels);
      m[p.gameId] = { stars: lv.reduce((s, l) => s + l.stars, 0), done: lv.filter((l) => l.completed).length };
    }
    return m;
  }, [all]);

  const areaStars = useMemo(() => {
    const r = {} as Record<WorldAreaId, number>;
    for (const a of AREAS) r[a] = a === 'party' ? 0 : registry.byArea(a).reduce((s, g) => s + (starsByGame[g.id]?.stars ?? 0), 0);
    return r;
  }, [starsByGame]);

  if (!profile) return null;
  const lp = levelProgress(profile.xp);
  const labels = Object.fromEntries(AREAS.map((a) => [a, t(`world.area.${a}`)])) as Record<WorldAreaId, string>;

  const openArea = (a: WorldAreaId) => {
    audio.play('whoosh');
    setLastArea(a);
    navigate({ name: 'world', area: a }, { replace: true });
  };
  const closeArea = () => navigate({ name: 'world' }, { replace: true });
  const games = area ? registry.byArea(area) : [];
  const recent = [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map((p) => registry.get(p.gameId)).filter(Boolean);
  const shortcuts = recent.length ? recent : registry.forAgeGroup(profile.ageGroup).slice(0, 3);

  return (
    <div className="world-screen" data-testid="world-screen">
      <WorldMap portrait={portrait} labels={labels} onArea={openArea} avatar={profile.avatar} avatarArea={area ?? lastArea} areaStars={areaStars} />

      <header className="world-hud">
        <button className="hud-profile" onClick={() => navigate({ name: 'avatar' })} aria-label={t('avatar.title')} data-testid="hud-avatar">
          <Avatar avatar={profile.avatar} size={54} />
          <span className="hud-profile-text">
            <strong>{profile.nickname}</strong>
            <span className="hud-level">
              {t('common.level')} {lp.level}
              <span className="hud-xp">
                <span style={{ width: `${Math.round(lp.ratio * 100)}%` }} />
              </span>
            </span>
          </span>
        </button>
        <span className="pill" data-testid="hud-stars" aria-label={t('common.stars')}>
          ⭐ {profile.stars}
        </span>
        <span className="pill" data-testid="hud-coins" aria-label={t('common.coins')}>
          🪙 {profile.coins}
        </span>
        <span className="spacer" />
        <button className="btn btn-round btn-ghost" aria-label={t('achievements.title')} onClick={() => navigate({ name: 'achievements' })} data-testid="nav-achievements">
          🏆
        </button>
        <button className="btn btn-round btn-ghost" aria-label={t('profiles.switch')} onClick={() => navigate({ name: 'profiles' })} data-testid="nav-profiles">
          👥
        </button>
        <button className="btn btn-round btn-ghost" aria-label={t('settings.title')} onClick={() => navigate({ name: 'settings' })} data-testid="nav-settings">
          ⚙️
        </button>
        <button className="btn btn-round btn-ghost" aria-label={t('settings.parents')} onClick={() => setGate(true)} data-testid="nav-parents">
          👪
        </button>
      </header>

      {!area && (
        <footer className="world-footer">
          <span className="pill hint-pill">👆 {t('world.tapArea')}</span>
          <div className="row" aria-label={t('world.shortcuts')}>
            {shortcuts.map((g) => (
              <button
                key={g!.id}
                className="btn btn-round"
                style={{ background: g!.color, width: 60, height: 60 }}
                onClick={() => {
                  audio.play('tap');
                  navigate({ name: 'lobby', gameId: g!.id });
                }}
                aria-label={t(g!.nameKey)}
                data-testid={`shortcut-${g!.id}`}
              >
                {g!.icon}
              </button>
            ))}
          </div>
        </footer>
      )}

      {area && (
        <>
          <div className="sheet-backdrop" onClick={closeArea} />
          <section className="sheet" aria-label={labels[area]} data-testid={`area-sheet-${area}`}>
            <div className="row">
              <h2 className="subtitle grow">{labels[area]}</h2>
              <button className="btn btn-round btn-ghost" onClick={closeArea} aria-label={t('common.close')} data-testid="area-close">
                ✖
              </button>
            </div>
            <p className="muted" style={{ marginTop: 4 }}>
              {t(`world.areaDesc.${area}`)}
            </p>
            {area === 'party' && <p className="badge">👫 {t('world.partyHint')}</p>}
            <div className="col" style={{ marginTop: 12 }}>
              {games.map((g) => {
                const s = starsByGame[g.id];
                const suitable = registry.isSuitable(g.id, profile.ageGroup);
                return (
                  <button
                    key={g.id}
                    className="game-card"
                    style={{ ['--c' as string]: g.color }}
                    onClick={() => {
                      audio.play('pop');
                      navigate({ name: 'lobby', gameId: g.id, versus: area === 'party' });
                    }}
                    data-testid={`game-card-${g.id}`}
                  >
                    <span className="game-card-icon">{g.icon}</span>
                    <span className="col grow" style={{ gap: 2, textAlign: 'start' }}>
                      <strong style={{ fontSize: '1.2rem' }}>
                        {t(g.nameKey)}
                        {area === 'party' && ` · 👫 ${t('lobby.versus')}`}
                      </strong>
                      <span className="muted small">{t(g.descriptionKey)}</span>
                      {!suitable && <span className="badge">{t('world.notForAge')}</span>}
                    </span>
                    <span className="col" style={{ alignItems: 'center', gap: 2 }}>
                      <Stars count={Math.min(3, Math.ceil((s?.stars ?? 0) / 4))} />
                      <span className="small muted">⭐ {s?.stars ?? 0}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {gate && (
        <ParentalGate
          onCancel={() => setGate(false)}
          onPass={() => {
            setGate(false);
            navigate({ name: 'parents' });
          }}
        />
      )}
    </div>
  );
}
