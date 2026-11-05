import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from './store';
import { installLifecycle, minimizeApp } from './lifecycle';
import { Onboarding } from '../features/onboarding/Onboarding';
import { ProfileSelect } from '../features/profiles/ProfileSelect';
import { WorldScreen } from '../features/world/WorldScreen';
import { Lobby } from '../features/play/Lobby';
import { GamePage } from '../features/play/GamePage';
import { AchievementsScreen } from '../features/achievements/AchievementsScreen';
import { AvatarEditor } from '../features/profiles/AvatarEditor';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { ParentsDashboard } from '../features/parents/ParentsDashboard';
import { Modal } from '../shared/components/ui';
import { Avatar } from '../shared/components/Avatar';
import { audio } from '../core/audio/audio';

function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const id = setTimeout(onDone, 1600);
    return () => clearTimeout(id);
  }, [onDone]);
  const letters = 'KidsPlay'.split('');
  return (
    <div className="screen splash" onClick={onDone} data-testid="splash">
      <div className="row anim-float" style={{ gap: 0 }}>
        <Avatar avatar={{ character: 'bunny', color: '#ff8fab', hat: 'party', accessory: 'none' }} size={110} />
        <Avatar avatar={{ character: 'dino', color: '#81c784', hat: 'cap', accessory: 'none' }} size={96} />
      </div>
      <div className="splash-logo" aria-label="KidsPlay">
        {letters.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <p className="subtitle" style={{ color: '#fff', textShadow: '0 2px 0 rgba(0,0,0,.15)' }}>
        {t('app.tagline')}
      </p>
    </div>
  );
}

/** Gentle playtime reminder configured by parents. Counts only foreground play time. */
function useBreakReminder(): [boolean, () => void] {
  const minutes = useApp((s) => s.settings.reminderMinutes);
  const screen = useApp((s) => s.screen.name);
  const [show, setShow] = useState(false);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [minutes]);
  useEffect(() => {
    if (!minutes) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || screen === 'parents' || screen === 'splash') return;
      elapsed.current += 5;
      if (elapsed.current >= minutes * 60) {
        elapsed.current = 0;
        setShow(true);
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [minutes, screen]);
  return [show, () => setShow(false)];
}

export function App() {
  const { t } = useTranslation();
  const { ready, screen, profile, profiles, navigate, back } = useApp();
  const [breakTime, dismissBreak] = useBreakReminder();

  useEffect(() => {
    void installLifecycle(() => {
      const s = useApp.getState().screen;
      if (s.name === 'world' && !s.area) void minimizeApp();
      else back();
    });
  }, [back]);

  const afterSplash = () => {
    if (!ready) return;
    if (!profiles.length) navigate({ name: 'onboarding' }, { replace: true });
    else if (profiles.length > 1 || !profile) navigate({ name: 'profiles' }, { replace: true });
    else {
      audio.playMusic();
      navigate({ name: 'world' }, { replace: true });
    }
  };

  let content: React.ReactNode = null;
  switch (screen.name) {
    case 'splash':
      content = <Splash onDone={afterSplash} />;
      break;
    case 'onboarding':
      content = <Onboarding isFirst={profiles.length === 0} />;
      break;
    case 'profiles':
      content = <ProfileSelect />;
      break;
    case 'world':
      content = profile ? <WorldScreen area={screen.area} /> : <ProfileSelect />;
      break;
    case 'lobby':
      content = <Lobby key={screen.gameId} gameId={screen.gameId} versus={screen.versus} />;
      break;
    case 'game':
      content = <GamePage key={JSON.stringify(screen.config)} config={screen.config} />;
      break;
    case 'achievements':
      content = <AchievementsScreen />;
      break;
    case 'avatar':
      content = <AvatarEditor />;
      break;
    case 'settings':
      content = <SettingsScreen />;
      break;
    case 'parents':
      content = <ParentsDashboard />;
      break;
  }

  return (
    <>
      {content}
      {breakTime && (
        <Modal onClose={dismissBreak}>
          <div className="col" style={{ alignItems: 'center', textAlign: 'center' }} data-testid="break-reminder">
            <span style={{ fontSize: '4rem' }} className="anim-bob">
              🧃
            </span>
            <h2 className="title">{t('parents.breakTitle')}</h2>
            <p className="subtitle muted">{t('parents.breakText')}</p>
            <button className="btn btn-primary btn-big" onClick={dismissBreak}>
              {t('parents.breakOk')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
