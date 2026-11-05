import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { Toggle, TopBar } from '../../shared/components/ui';
import { ParentalGate } from '../../shared/components/ParentalGate';
import type { Locale } from '../../core/game-engine/types';
import { audio } from '../../core/audio/audio';

/** Child-accessible settings. Anything sensitive lives behind the parental gate. */
export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { setAppLocale, back, navigate } = useApp();
  const [gate, setGate] = useState(false);
  return (
    <div className="screen screen-mint scroll" data-testid="settings-screen">
      <TopBar title={`⚙️ ${t('settings.title')}`} onBack={back} />
      <div className="col" style={{ maxWidth: 560, margin: '0 auto', width: '100%', gap: 14 }}>
        <AudioSettingsCard />
        <div className="card col">
          <h2 className="subtitle">🌍 {t('settings.language')}</h2>
          <div className="segmented">
            {(['en', 'ar'] as Locale[]).map((l) => (
              <button
                key={l}
                className={`btn ${i18n.language === l ? 'btn-secondary selected' : ''}`}
                onClick={() => {
                  audio.play('tap');
                  void setAppLocale(l);
                }}
                data-testid={`settings-lang-${l}`}
              >
                {t(`lang.${l}`)}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-big" onClick={() => setGate(true)} data-testid="settings-parents">
          👪 {t('settings.parents')}
        </button>
      </div>
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

export function AudioSettingsCard() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();
  return (
    <div className="card col">
      <div className="row">
        <span className="grow" style={{ fontWeight: 800 }}>
          🎵 {t('settings.music')}
        </span>
        <Toggle
          checked={settings.musicEnabled}
          label={t('settings.music')}
          onChange={(v) => {
            void updateSettings({ musicEnabled: v });
            if (v) audio.playMusic();
          }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={settings.musicVolume}
        aria-label={`${t('settings.music')} ${t('settings.volume')}`}
        disabled={!settings.musicEnabled}
        onChange={(e) => void updateSettings({ musicVolume: Number(e.target.value) })}
      />
      <div className="row">
        <span className="grow" style={{ fontWeight: 800 }}>
          🔔 {t('settings.sfx')}
        </span>
        <Toggle checked={settings.sfxEnabled} label={t('settings.sfx')} onChange={(v) => void updateSettings({ sfxEnabled: v })} />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={settings.sfxVolume}
        aria-label={`${t('settings.sfx')} ${t('settings.volume')}`}
        disabled={!settings.sfxEnabled}
        onChange={(e) => {
          void updateSettings({ sfxVolume: Number(e.target.value) });
          audio.play('pop');
        }}
      />
    </div>
  );
}
