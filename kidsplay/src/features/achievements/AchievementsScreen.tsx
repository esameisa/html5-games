import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { ACHIEVEMENTS, unlockedAchievements } from '../../core/rewards/service';
import { TopBar } from '../../shared/components/ui';

export function AchievementsScreen() {
  const { t, i18n } = useTranslation();
  const { profile, back } = useApp();
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (profile) void unlockedAchievements(profile.id).then(setUnlocked);
  }, [profile]);
  if (!profile) return null;
  return (
    <div className="screen screen-soft scroll" data-testid="achievements-screen">
      <TopBar title={`🏆 ${t('achievements.title')}`} onBack={back} />
      <p className="subtitle" style={{ textAlign: 'center' }}>
        {t('achievements.count', { n: unlocked.size, total: ACHIEVEMENTS.length })}
      </p>
      <div className="grid-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginTop: 12 }}>
        {ACHIEVEMENTS.map((a) => {
          const at = unlocked.get(a.id);
          return (
            <div key={a.id} className={`tile${at ? '' : ' locked'}`} style={{ cursor: 'default' }} data-testid={`ach-${a.id}`} data-unlocked={!!at}>
              <span className="tile-icon">{at ? a.icon : '🔒'}</span>
              <strong>{t(a.titleKey)}</strong>
              <span className="muted small" style={{ textAlign: 'center' }}>
                {t(a.descKey)}
              </span>
              <span className="small">{at ? t('achievements.unlocked', { date: new Date(at).toLocaleDateString(i18n.language) }) : t('achievements.lockedHint')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
