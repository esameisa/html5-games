import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './app/App';
import { useApp } from './app/store';
import { i18n } from './core/localization/i18n';
import { installGames } from './games';
import { contentLibrary } from './core/content-packs/library';
import { openDatabase, requestPersistence, resetDatabase } from './core/storage/db';
import './app/styles.css';

async function boot() {
  installGames();
  const root = createRoot(document.getElementById('root')!);
  const opened = await openDatabase();
  if (!opened.ok) {
    root.render(
      <div className="screen splash">
        <p className="subtitle">{i18n.t('app.storageError')}</p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            await resetDatabase();
            location.reload();
          }}
        >
          {i18n.t('app.reset')}
        </button>
      </div>,
    );
    return;
  }
  void requestPersistence();
  try {
    await contentLibrary.loadInstalled();
  } catch (e) {
    console.warn('[content] could not load installed packs', e);
  }
  await useApp.getState().init();
  root.render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </StrictMode>,
  );
}

void boot();
