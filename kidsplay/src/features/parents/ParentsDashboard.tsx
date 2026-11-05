import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { ConfirmDialog, TopBar } from '../../shared/components/ui';
import { Avatar } from '../../shared/components/Avatar';
import { AudioSettingsCard } from '../settings/SettingsScreen';
import { ContentManager } from './ContentManager';
import { profiles as profileRepo, progress as progressRepo, results as resultsRepo } from '../../core/storage/repositories';
import { estimateStorage, resetDatabase, type Profile, type StorageEstimate, type StoredResult } from '../../core/storage/db';
import { registry } from '../../games';
import { levelForXp } from '../../core/rewards/rewards';
import { formatTime } from '../../shared/utils/text';
import type { AgeGroup, GameProgress, Locale } from '../../core/game-engine/types';
import { contentLibrary } from '../../core/content-packs/library';

type Tab = 'profiles' | 'activity' | 'settings' | 'content' | 'data';
const REMINDERS = [0, 15, 20, 30, 45, 60];

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ParentsDashboard() {
  const { t } = useTranslation();
  const { back } = useApp();
  const [tab, setTab] = useState<Tab>('profiles');
  return (
    <div className="screen scroll" style={{ background: '#f5f6fb' }} data-testid="parents-dashboard">
      <TopBar title={`👪 ${t('parents.title')}`} onBack={back} />
      <div className="segmented" style={{ maxWidth: 900, margin: '0 auto 14px', width: '100%' }}>
        {(['profiles', 'activity', 'settings', 'content', 'data'] as Tab[]).map((k) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-secondary selected' : ''}`} onClick={() => setTab(k)} data-testid={`parents-tab-${k}`}>
            {
              {
                profiles: `👧 ${t('parents.profiles')}`,
                activity: `📈 ${t('parents.activity')}`,
                settings: `🔔 ${t('settings.title')}`,
                content: `📦 ${t('parents.content')}`,
                data: `🔐 ${t('parents.data')}`,
              }[k]
            }
          </button>
        ))}
      </div>
      <div className="col" style={{ maxWidth: 900, margin: '0 auto', width: '100%', gap: 14 }}>
        {tab === 'profiles' && <ProfilesTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'content' && <ContentManager />}
        {tab === 'data' && <DataTab />}
      </div>
    </div>
  );
}

function ProfilesTab() {
  const { t } = useTranslation();
  const { profiles, reloadProfiles, profile: active, selectProfile, navigate } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Profile | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, GameProgress[]>>({});

  useEffect(() => {
    void Promise.all(profiles.map(async (p) => [p.id, await progressRepo.allForProfile(p.id)] as const)).then((rows) =>
      setProgressMap(Object.fromEntries(rows)),
    );
  }, [profiles]);

  return (
    <>
      {profiles.map((p) => (
        <div key={p.id} className="card col" data-testid={`parent-profile-${p.nickname}`}>
          <div className="row wrap">
            <Avatar avatar={p.avatar} size={56} />
            <div className="col grow" style={{ gap: 2 }}>
              <strong style={{ fontSize: '1.2rem' }}>{p.nickname}</strong>
              <span className="muted small">
                {t(`age.${p.ageGroup}`)} · {t(`lang.${p.locale}`)} · {t('common.level')} {levelForXp(p.xp)} · ⭐ {p.stars} · 🪙 {p.coins}
              </span>
            </div>
            <button className="btn btn-sm" onClick={() => setEditing(editing === p.id ? null : p.id)}>
              ✏️ {t('parents.editProfile')}
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setConfirm(p)} data-testid={`delete-profile-${p.nickname}`}>
              🗑️
            </button>
          </div>
          {editing === p.id && <EditProfile p={p} onDone={() => void reloadProfiles().then(() => setEditing(null))} />}
          <div className="row wrap" style={{ gap: 6 }}>
            {registry.all().map((g) => {
              const gp = progressMap[p.id]?.find((x) => x.gameId === g.id);
              const lv = gp ? Object.values(gp.levels) : [];
              return (
                <span key={g.id} className="pill small" title={t(g.nameKey)}>
                  {g.icon} {lv.filter((l) => l.completed).length} ✔ · ⭐ {lv.reduce((s, l) => s + l.stars, 0)}
                </span>
              );
            })}
          </div>
        </div>
      ))}
      {confirm && (
        <ConfirmDialog
          danger
          text={t('parents.deleteProfileConfirm', { name: confirm.nickname })}
          onNo={() => setConfirm(null)}
          onYes={async () => {
            await profileRepo.remove(confirm.id);
            setConfirm(null);
            await reloadProfiles();
            const remaining = await profileRepo.list();
            if (active?.id === confirm.id) {
              if (remaining[0]) await selectProfile(remaining[0].id);
              else {
                useApp.setState({ profile: null });
                navigate({ name: 'onboarding' }, { replace: true });
              }
            }
          }}
        />
      )}
    </>
  );
}

function EditProfile({ p, onDone }: { p: Profile; onDone: () => void }) {
  const { t } = useTranslation();
  const { setAppLocale, profile } = useApp();
  const [name, setName] = useState(p.nickname);
  const [age, setAge] = useState<AgeGroup>(p.ageGroup);
  const [locale, setLocale] = useState<Locale>(p.locale);
  return (
    <div className="card card-soft col">
      <label className="col">
        <span style={{ fontWeight: 800 }}>{t('parents.rename')}</span>
        <input className="text-input" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
      </label>
      <span style={{ fontWeight: 800 }}>{t('parents.ageGroup')}</span>
      <div className="segmented">
        {(['4-6', '7-9', '10-12'] as AgeGroup[]).map((g) => (
          <button key={g} className={`btn btn-sm ${age === g ? 'btn-secondary' : ''}`} onClick={() => setAge(g)}>
            {t(`age.${g}`)}
          </button>
        ))}
      </div>
      <span style={{ fontWeight: 800 }}>{t('parents.language')}</span>
      <div className="segmented">
        {(['en', 'ar'] as Locale[]).map((l) => (
          <button key={l} className={`btn btn-sm ${locale === l ? 'btn-secondary' : ''}`} onClick={() => setLocale(l)}>
            {t(`lang.${l}`)}
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary"
        disabled={!name.trim()}
        onClick={async () => {
          await profileRepo.update(p.id, { nickname: name, ageGroup: age, locale });
          if (profile?.id === p.id) await setAppLocale(locale);
          onDone();
        }}
      >
        {t('common.save')}
      </button>
    </div>
  );
}

function ActivityTab() {
  const { t, i18n } = useTranslation();
  const { profiles } = useApp();
  const [rows, setRows] = useState<(StoredResult & { nickname: string })[]>([]);
  useEffect(() => {
    void Promise.all(profiles.map(async (p) => (await resultsRepo.forProfile(p.id, 100)).map((r) => ({ ...r, nickname: p.nickname })))).then((all) =>
      setRows(all.flat().sort((a, b) => b.playedAt.localeCompare(a.playedAt))),
    );
  }, [profiles]);
  const total = rows.reduce((s, r) => s + r.durationSeconds, 0);
  return (
    <div className="card col" data-testid="activity-list">
      <div className="row wrap">
        <span className="pill">⏱️ {t('parents.totalTime', { t: formatTime(total) })}</span>
        <span className="pill">🎮 {t('parents.gamesPlayed', { n: rows.length })}</span>
      </div>
      {rows.length === 0 && <p className="muted">{t('parents.noActivity')}</p>}
      {rows.slice(0, 60).map((r) => {
        const g = registry.get(r.gameId);
        return (
          <div key={r.id} className="row" style={{ borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
            <span style={{ fontSize: '1.5rem' }}>{g?.icon}</span>
            <span className="grow">
              <strong>{r.nickname}</strong> · {g ? t(g.nameKey) : r.gameId} · {t(`difficulty.${r.difficulty}`)}
              {r.mode === 'versus' ? ' · 👫' : ''}
              <br />
              <span className="muted small">
                {new Date(r.playedAt).toLocaleString(i18n.language)} · {formatTime(r.durationSeconds)}
              </span>
            </span>
            <span>{r.completed ? '⭐'.repeat(r.stars) || '✔' : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, setAppLocale } = useApp();
  return (
    <>
      <div className="card col">
        <h2 className="subtitle">⏰ {t('parents.reminders')}</h2>
        <div className="segmented">
          {REMINDERS.map((m) => (
            <button
              key={m}
              className={`btn btn-sm ${settings.reminderMinutes === m ? 'btn-secondary selected' : ''}`}
              onClick={() => void updateSettings({ reminderMinutes: m })}
              data-testid={`reminder-${m}`}
            >
              {m === 0 ? t('parents.reminderOff') : t('parents.reminderMinutes', { n: m })}
            </button>
          ))}
        </div>
      </div>
      <h2 className="subtitle">🔊 {t('parents.audio')}</h2>
      <AudioSettingsCard />
      <div className="card col">
        <h2 className="subtitle">🌍 {t('parents.language')}</h2>
        <div className="segmented">
          {(['en', 'ar'] as Locale[]).map((l) => (
            <button key={l} className={`btn btn-sm ${i18n.language === l ? 'btn-secondary selected' : ''}`} onClick={() => void setAppLocale(l)}>
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function DataTab() {
  const { t } = useTranslation();
  const [est, setEst] = useState<StorageEstimate | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    void estimateStorage().then(setEst);
  }, []);
  return (
    <>
      <div className="card col">
        <p style={{ margin: 0 }}>🔐 {t('parents.privacy')}</p>
        {est && <p className="muted">{t('parents.storage', { used: fmtBytes(est.usage), quota: fmtBytes(est.quota) })}</p>}
      </div>
      <button className="btn btn-danger btn-big" onClick={() => setConfirm(true)} data-testid="delete-all">
        🗑️ {t('parents.deleteAll')}
      </button>
      {confirm && (
        <ConfirmDialog
          danger
          text={t('parents.deleteAllConfirm')}
          onNo={() => setConfirm(false)}
          onYes={async () => {
            await resetDatabase();
            try {
              localStorage.clear();
            } catch {
              /* ignore */
            }
            await contentLibrary.loadInstalled();
            useApp.setState({ profile: null, profiles: [], history: [] });
            await useApp.getState().updateSettings({ activeProfileId: null });
            useApp.getState().navigate({ name: 'onboarding' }, { replace: true });
          }}
        />
      )}
    </>
  );
}
