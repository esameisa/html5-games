import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../app/store';
import { contentLibrary } from '../../core/content-packs/library';
import { ContentInstaller, InstallError, isAllowedSource, listInstalledPacks, uninstallPack, type AvailablePack } from '../../core/content-packs/installer';
import type { InstalledPack } from '../../core/storage/db';
import { loc } from '../../shared/utils/text';

function fmtSize(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Parent-only screen to fetch optional, declarative content packs from a static HTTPS host. */
export function ContentManager() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useApp();
  const [url, setUrl] = useState(settings.contentSourceUrl);
  const [available, setAvailable] = useState<AvailablePack[] | null>(null);
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  const refreshInstalled = () => void listInstalledPacks().then(setInstalled);
  useEffect(refreshInstalled, []);

  const installer = () => new ContentInstaller(url);

  const check = async () => {
    setMessage('');
    setBusy('check');
    try {
      await updateSettings({ contentSourceUrl: url });
      setAvailable(await installer().checkRemote());
    } catch (e) {
      setMessage(t('content.error', { msg: e instanceof InstallError ? e.message : String(e) }));
      setAvailable(null);
    } finally {
      setBusy(null);
    }
  };

  const install = async (a: AvailablePack) => {
    setMessage('');
    setBusy(a.entry.id);
    setProgress(0);
    try {
      await installer().install(a.entry, setProgress);
      setMessage(t('content.success'));
      refreshInstalled();
      setAvailable(await installer().checkRemote());
    } catch (e) {
      setMessage(t('content.error', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(null);
    }
  };

  const bundled = contentLibrary.allPacks().filter((p) => p.bundled);

  return (
    <>
      <div className="card col" data-testid="content-manager">
        <h2 className="subtitle">📦 {t('parents.content')}</h2>
        {!online && <p className="badge">📴 {t('content.offline')}</p>}
        <label className="col">
          <span style={{ fontWeight: 800 }}>{t('content.source')}</span>
          <input className="text-input" style={{ fontSize: '1rem' }} value={url} onChange={(e) => setUrl(e.target.value)} data-testid="content-url" />
        </label>
        <button className="btn btn-secondary" onClick={() => void check()} disabled={!!busy || !isAllowedSource(url)} data-testid="content-check">
          🔎 {busy === 'check' ? t('content.checking') : t('content.check')}
        </button>
        {message && (
          <p role="status" className="badge" data-testid="content-message">
            {message}
          </p>
        )}
      </div>

      {available && (
        <div className="card col">
          <h3 className="subtitle">{t('content.available')}</h3>
          {available.length === 0 && <p className="muted">{t('content.none')}</p>}
          {available.map((a) => (
            <div key={a.entry.id} className="row" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }} data-testid={`remote-pack-${a.entry.id}`}>
              <span className="grow">
                <strong>{loc(a.entry.title, i18n.language)}</strong>
                <br />
                <span className="muted small">
                  {a.entry.type} · v{a.entry.version} · {fmtSize(a.entry.sizeBytes)}
                  {a.installedVersion ? ` · ${t('content.installed')} v${a.installedVersion}` : ''}
                </span>
              </span>
              {a.state === 'incompatible' ? (
                <span className="badge">{t('content.incompatible')}</span>
              ) : a.state === 'installed' ? (
                <span className="badge" style={{ background: 'var(--success)', color: '#fff' }}>
                  ✔ {t('content.installed')}
                </span>
              ) : (
                <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => void install(a)} data-testid={`install-${a.entry.id}`}>
                  {busy === a.entry.id ? t('content.installing', { p: Math.round(progress * 100) }) : a.state === 'update_available' ? t('content.update') : t('content.install')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card col">
        <h3 className="subtitle">{t('content.installedList')}</h3>
        {bundled.map((p) => (
          <div key={p.manifest.id} className="row">
            <span className="grow">
              {loc(p.manifest.title, i18n.language)} <span className="muted small">v{p.manifest.version}</span>
            </span>
            <span className="badge">{t('content.bundled')}</span>
          </div>
        ))}
        {installed.map((p) => (
          <div key={p.id} className="row" data-testid={`installed-pack-${p.id}`}>
            <span className="grow">
              {loc((p.manifest as { title: Record<string, string> }).title, i18n.language)}{' '}
              <span className="muted small">
                v{p.version} · {fmtSize(p.sizeBytes)}
              </span>
            </span>
            <button
              className="btn btn-sm btn-danger"
              onClick={async () => {
                await uninstallPack(p.id);
                refreshInstalled();
                if (available) setAvailable(await installer().compare({ schemaVersion: 1, packs: available.map((a) => a.entry) }));
              }}
            >
              {t('content.remove')}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
