import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { Avatar } from '../../shared/components/Avatar';
import { audio } from '../../core/audio/audio';
import { levelForXp } from '../../core/rewards/rewards';

export const MAX_PROFILES = 8;

export function ProfileSelect() {
  const { t } = useTranslation();
  const { profiles, selectProfile, navigate } = useApp();
  return (
    <div className="screen screen-violet scroll" data-testid="profile-select">
      <h1 className="title" style={{ textAlign: 'center', margin: '12px 0 20px' }}>
        {t('profiles.title')}
      </h1>
      <div className="grid-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {profiles.map((p) => (
          <button
            key={p.id}
            className="tile"
            data-testid={`profile-${p.nickname}`}
            onClick={async () => {
              audio.unlock();
              audio.play('pop');
              audio.playMusic();
              await selectProfile(p.id);
              navigate({ name: 'world' }, { replace: true });
            }}
          >
            <Avatar avatar={p.avatar} size={96} />
            <span style={{ fontSize: '1.2rem' }}>{p.nickname}</span>
            <span className="muted small">
              {t('common.level')} {levelForXp(p.xp)} · ⭐ {p.stars}
            </span>
          </button>
        ))}
        {profiles.length < MAX_PROFILES && (
          <button
            className="tile"
            onClick={() => {
              audio.unlock();
              audio.play('tap');
              navigate({ name: 'onboarding' });
            }}
            data-testid="add-profile"
          >
            <span className="tile-icon" style={{ fontSize: 64 }}>
              ➕
            </span>
            <span>{t('profiles.add')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
