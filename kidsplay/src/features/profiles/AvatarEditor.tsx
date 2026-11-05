import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { Avatar } from '../../shared/components/Avatar';
import { TopBar } from '../../shared/components/ui';
import { COSMETICS, canUnlock, isOwned, type CosmeticItem, type CosmeticSlot } from '../../core/rewards/cosmetics';
import { levelForXp } from '../../core/rewards/rewards';
import { unlockCosmetic } from '../../core/rewards/service';
import { profiles as profileRepo } from '../../core/storage/repositories';
import { audio } from '../../core/audio/audio';

const SLOTS: CosmeticSlot[] = ['character', 'color', 'hat', 'accessory'];

export function AvatarEditor() {
  const { t } = useTranslation();
  const { profile, setProfile, back } = useApp();
  const [slot, setSlot] = useState<CosmeticSlot>('character');
  const [message, setMessage] = useState('');
  if (!profile) return null;
  const level = levelForXp(profile.xp);
  const items = COSMETICS.filter((c) => c.slot === slot);

  const choose = async (item: CosmeticItem) => {
    setMessage('');
    let p = profile;
    if (!isOwned(item, p.unlocked)) {
      const check = canUnlock(item, p.coins, level, p.unlocked);
      if (!check.ok) {
        audio.play('error');
        setMessage(check.reason === 'level' ? t('avatar.needLevel', { n: item.minLevel }) : t('avatar.notEnough'));
        return;
      }
      p = await unlockCosmetic(p.id, item.id);
      audio.play('unlock');
    } else audio.play('pop');
    const avatar = { ...p.avatar, [slot]: item.value };
    setProfile(await profileRepo.update(p.id, { avatar, unlocked: p.unlocked, coins: p.coins }));
  };

  return (
    <div className="screen screen-violet" data-testid="avatar-editor">
      <TopBar title={t('avatar.title')} onBack={back} right={<span className="pill">🪙 {profile.coins}</span>} />
      <div className="center anim-bob" style={{ minHeight: 150 }}>
        <Avatar avatar={profile.avatar} size={150} />
      </div>
      <div className="segmented" style={{ margin: '8px 0' }}>
        {SLOTS.map((s) => (
          <button key={s} className={`btn btn-sm ${slot === s ? 'btn-secondary selected' : ''}`} onClick={() => setSlot(s)} data-testid={`slot-${s}`}>
            {t(`avatar.${s}`)}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="badge" style={{ textAlign: 'center' }}>
          {message}
        </p>
      )}
      <div className="grow" style={{ overflowY: 'auto' }}>
        <div className="grid-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', paddingBottom: 12 }}>
          {items.map((item) => {
            const owned = isOwned(item, profile.unlocked);
            const selected = profile.avatar[slot as keyof typeof profile.avatar] === item.value;
            const preview = { ...profile.avatar, [slot]: item.value };
            return (
              <button
                key={item.id}
                className={`tile${selected ? ' selected' : ''}`}
                style={selected ? { outline: '4px solid var(--secondary)' } : undefined}
                onClick={() => void choose(item)}
                data-testid={`item-${item.id}`}
              >
                {slot === 'color' ? (
                  <span style={{ width: 56, height: 56, borderRadius: '50%', background: item.value, display: 'block', boxShadow: 'var(--shadow-sm)' }} />
                ) : (
                  <Avatar avatar={preview} size={64} />
                )}
                <span className="small">{t(item.labelKey)}</span>
                {!owned && (
                  <span className="badge">
                    {level < item.minLevel ? `🔒 ${t('avatar.needLevel', { n: item.minLevel })}` : `🪙 ${item.cost}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
