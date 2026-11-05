import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { Avatar, DEFAULT_AVATAR } from '../../shared/components/Avatar';
import { profiles } from '../../core/storage/repositories';
import { audio } from '../../core/audio/audio';
import { setLocale } from '../../core/localization/i18n';
import type { AgeGroup, Locale } from '../../core/game-engine/types';
import { CHARACTERS, COLORS } from '../../core/rewards/cosmetics';
import type { AvatarConfig } from '../../core/storage/db';

const STEPS = ['welcome', 'language', 'nickname', 'avatar', 'age', 'ready'] as const;
const FREE_CHARS = CHARACTERS.slice(0, 6);
const FREE_COLORS = COLORS.slice(0, 6);

export function Onboarding({ isFirst }: { isFirst: boolean }) {
  const { t, i18n } = useTranslation();
  const { navigate, reloadProfiles, selectProfile, profiles: existing } = useApp();
  const [step, setStep] = useState(isFirst ? 0 : 1);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('7-9');
  const [locale, setLoc] = useState<Locale>((i18n.language as Locale) ?? 'en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const name = STEPS[step];

  const next = () => {
    audio.unlock();
    audio.play('pop');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const prev = () => {
    audio.play('tap');
    if (step <= (isFirst ? 0 : 1)) {
      if (!isFirst) navigate({ name: existing.length ? 'profiles' : 'onboarding' });
      return;
    }
    setStep((s) => s - 1);
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const p = await profiles.create({ nickname, avatar, ageGroup, locale });
      await reloadProfiles();
      await selectProfile(p.id);
      audio.play('win');
      audio.playMusic();
      navigate({ name: 'world' }, { replace: true });
    } catch (e) {
      setError(String((e as Error).message));
      setBusy(false);
    }
  };

  return (
    <div className="screen screen-soft" data-testid={`onboarding-${name}`}>
      <div className="row">
        {step > 0 && (
          <button className="btn btn-round btn-ghost" onClick={prev} aria-label={t('common.back')}>
            <span className="flip-rtl">⬅️</span>
          </button>
        )}
        <div className="spacer" />
        <span className="muted small">{t('onboarding.step', { n: step + 1, total: STEPS.length })}</span>
      </div>
      <div className="grow col" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18, overflowY: 'auto' }}>
        {name === 'welcome' && (
          <>
            <div className="anim-float" style={{ display: 'flex', gap: 8 }}>
              <Avatar avatar={{ ...DEFAULT_AVATAR, character: 'bear', color: '#ffb74d' }} size={90} />
              <Avatar avatar={DEFAULT_AVATAR} size={110} />
              <Avatar avatar={{ ...DEFAULT_AVATAR, character: 'dino', color: '#81c784' }} size={90} />
            </div>
            <h1 className="title">{t('onboarding.welcome')}</h1>
            <p className="subtitle muted">{t('onboarding.welcomeSub')}</p>
            <button className="btn btn-primary btn-big anim-pulse" onClick={next} data-testid="onboarding-start">
              {t('onboarding.letsGo')}
            </button>
          </>
        )}

        {name === 'language' && (
          <>
            <h1 className="title">🌍 {t('onboarding.language')}</h1>
            <div className="row wrap center">
              {(['en', 'ar'] as Locale[]).map((l) => (
                <button
                  key={l}
                  className={`btn btn-big ${locale === l ? 'btn-secondary selected' : ''}`}
                  onClick={async () => {
                    audio.unlock();
                    audio.play('tap');
                    setLoc(l);
                    await setLocale(l);
                  }}
                  data-testid={`lang-${l}`}
                >
                  {t(`lang.${l}`)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-big" onClick={next}>
              {t('common.next')}
            </button>
          </>
        )}

        {name === 'nickname' && (
          <>
            <h1 className="title">✏️ {t('onboarding.nickname')}</h1>
            <p className="muted">{t('onboarding.nicknameHint')}</p>
            <input
              className="text-input"
              style={{ maxWidth: 380, textAlign: 'center' }}
              value={nickname}
              maxLength={16}
              autoComplete="off"
              placeholder={t('onboarding.nicknamePh')}
              aria-label={t('onboarding.nicknamePh')}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && next()}
              data-testid="nickname-input"
            />
            <button className="btn btn-primary btn-big" disabled={!nickname.trim()} onClick={next} data-testid="nickname-next">
              {t('common.next')}
            </button>
          </>
        )}

        {name === 'avatar' && (
          <>
            <h1 className="title">{t('onboarding.avatar')}</h1>
            <div className="anim-bob">
              <Avatar avatar={avatar} size={140} />
            </div>
            <div className="row wrap center" role="radiogroup" aria-label={t('avatar.character')}>
              {FREE_CHARS.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={avatar.character === c}
                  className={`btn ${avatar.character === c ? 'selected' : ''}`}
                  style={{ padding: 4 }}
                  onClick={() => {
                    audio.play('pop');
                    setAvatar({ ...avatar, character: c });
                  }}
                  aria-label={t(`avatar.char.${c}`)}
                  data-testid={`char-${c}`}
                >
                  <Avatar avatar={{ ...avatar, character: c, hat: 'none', accessory: 'none' }} size={54} />
                </button>
              ))}
            </div>
            <div className="row wrap center">
              {FREE_COLORS.map((c) => (
                <button
                  key={c}
                  className={`btn btn-round ${avatar.color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  aria-label={`${t('avatar.color')} ${c}`}
                  onClick={() => {
                    audio.play('tap');
                    setAvatar({ ...avatar, color: c });
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary btn-big" onClick={next} data-testid="avatar-next">
              {t('common.next')}
            </button>
          </>
        )}

        {name === 'age' && (
          <>
            <h1 className="title">🎂 {t('onboarding.age')}</h1>
            <div className="col" style={{ width: 'min(360px, 100%)' }}>
              {(['4-6', '7-9', '10-12'] as AgeGroup[]).map((g) => (
                <button
                  key={g}
                  className={`btn btn-big ${ageGroup === g ? 'btn-secondary selected' : ''}`}
                  onClick={() => {
                    audio.play('tap');
                    setAgeGroup(g);
                  }}
                  data-testid={`age-${g}`}
                >
                  {t(`age.${g}`)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-big" onClick={next} data-testid="age-next">
              {t('common.next')}
            </button>
          </>
        )}

        {name === 'ready' && (
          <>
            <div className="anim-float">
              <Avatar avatar={avatar} size={160} />
            </div>
            <h1 className="title">{t('onboarding.ready', { name: nickname.trim() })}</h1>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            <button className="btn btn-success btn-big anim-pulse" disabled={busy} onClick={finish} data-testid="onboarding-finish">
              🚀 {t('onboarding.enter')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
