import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, type LaunchConfig } from '../../app/store';
import { registry } from '../../games';
import { GameManager, type LifecycleState } from '../../core/game-engine/GameManager';
import type { GameResult } from '../../core/game-engine/types';
import { applyResult, type ResultOutcome } from '../../core/rewards/service';
import { progress as progressRepo } from '../../core/storage/repositories';
import { createGameServices, type ProgressHandle } from '../../app/gameServices';
import { audio } from '../../core/audio/audio';
import { Confetti, Modal, Stars } from '../../shared/components/ui';
import { appEvents } from '../../app/lifecycle';
import { levelForXp } from '../../core/rewards/rewards';
import type { Locale } from '../../core/game-engine/types';

export function GamePage({ config }: { config: LaunchConfig }) {
  const { t, i18n } = useTranslation();
  const { profile, setProfile, navigate } = useApp();
  const stageRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<GameManager | null>(null);
  const progressRef = useRef<ProgressHandle | null>(null);
  const [state, setState] = useState<LifecycleState>('idle');
  const [outcome, setOutcome] = useState<{ result: GameResult; outcome: ResultOutcome } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const game = registry.get(config.gameId);

  const exit = useCallback(() => {
    managerRef.current?.destroy();
    navigate({ name: 'world', area: game?.area === 'party' || config.mode === 'versus' ? 'party' : game?.area }, { replace: true });
  }, [navigate, game, config.mode]);

  useEffect(() => {
    if (!game || !profile || !stageRef.current) return;
    let cancelled = false;
    const manager = new GameManager(
      {
        onState: setState,
        onError: (e) => setError(String((e as Error)?.message ?? e)),
        onResult: async (result) => {
          try {
            const out = await applyResult(result);
            if (cancelled) return;
            progressRef.current?.set(out.progress);
            setProfile(out.profile);
            setOutcome({ result, outcome: out });
            audio.play('coin');
          } catch (e) {
            console.error(e);
          }
        },
      },
      () => exit(),
    );
    managerRef.current = manager;
    void (async () => {
      const initial = await progressRepo.get(profile.id, game.id);
      if (cancelled || !stageRef.current) return;
      const { services, progress } = createGameServices(profile.id, game.id, initial);
      progressRef.current = progress;
      await manager.launch(game, stageRef.current, {
        gameId: game.id,
        profileId: profile.id,
        ageGroup: profile.ageGroup,
        locale: (i18n.language as Locale) ?? profile.locale,
        difficulty: config.difficulty,
        mode: config.mode,
        players: config.players,
        options: config.options,
        services,
      });
    })();
    return () => {
      cancelled = true;
      manager.destroy();
      managerRef.current = null;
    };
    // Launch once per mount; profile updates from rewards must not remount the game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-pause when the app goes to the background or the Android back button is pressed.
  useEffect(() => {
    const off1 = appEvents.on('background', () => managerRef.current?.pause());
    const off2 = appEvents.on('backButton', () => {
      const m = managerRef.current;
      if (m?.state === 'paused') exit();
      else m?.pause();
    });
    return () => {
      off1();
      off2();
    };
  }, [exit]);

  if (!game) return null;
  const paused = state === 'paused';
  const r = outcome?.result;
  const winnerName = r?.winner !== undefined && r.winner >= 0 ? config.players[r.winner]?.name : null;

  return (
    <div className="game-shell" data-testid={`game-${game.id}`} data-state={state}>
      <div className="game-shell-bar">
        <button className="btn btn-round btn-ghost" aria-label={t('common.pause')} onClick={() => managerRef.current?.pause()} data-testid="game-pause">
          ⏸️
        </button>
        <span className="game-title">
          {game.icon} {t(game.nameKey)}
        </span>
        <button className="btn btn-round btn-ghost" aria-label={t('common.exit')} onClick={exit} data-testid="game-exit">
          🏠
        </button>
      </div>
      <div className="game-stage" ref={stageRef} />
      {state === 'loading' && (
        <div className="overlay" style={{ background: 'rgba(255,255,255,.6)' }}>
          <div className="title anim-pulse">{t('app.loading')}</div>
        </div>
      )}
      {error && (
        <Modal>
          <p className="subtitle">😕 {error}</p>
          <button className="btn btn-primary" onClick={exit}>
            {t('result.backToWorld')}
          </button>
        </Modal>
      )}
      {paused && !outcome && (
        <div className="pause-overlay">
          <Modal onClose={() => managerRef.current?.resume()}>
            <h2 className="title">⏸️ {t('common.paused')}</h2>
            <div className="col" style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-big" onClick={() => managerRef.current?.resume()} data-testid="pause-resume">
                ▶️ {t('common.resume')}
              </button>
              <button className="btn btn-big" onClick={() => void managerRef.current?.restart()} data-testid="pause-restart">
                🔄 {t('common.restart')}
              </button>
              <button className="btn btn-big" onClick={exit} data-testid="pause-exit">
                🏠 {t('common.exit')}
              </button>
            </div>
          </Modal>
        </div>
      )}
      {outcome && r && (
        <>
          <Confetti active={r.completed} />
          <Modal>
            <div className="col" style={{ alignItems: 'center', textAlign: 'center' }} data-testid="result-modal">
              <h2 className="title">
                {winnerName ? `🏆 ${t('common.wins', { name: winnerName })}` : r.winner === -1 ? `🤝 ${t('common.draw')}` : r.completed ? `🎉 ${t('result.complete')}` : t('result.failed')}
              </h2>
              {r.mode !== 'versus' && <Stars count={r.stars} big size="3rem" />}
              <p className="subtitle">{r.completed ? t('common.greatJob') : t('common.keepTrying')}</p>
              <div className="row center wrap">
                <span className="pill">🪙 +{outcome.outcome.reward.coins}</span>
                <span className="pill">✨ +{outcome.outcome.reward.xp} XP</span>
                {outcome.outcome.reward.stars > 0 && <span className="pill">⭐ +{outcome.outcome.reward.stars}</span>}
              </div>
              {outcome.outcome.leveledUp && <p className="badge anim-pulse">🎈 {t('result.levelUp', { level: levelForXp(outcome.outcome.profile.xp) })}</p>}
              {outcome.outcome.achievements.map((a) => (
                <div key={a.id} className="card card-soft row" style={{ padding: 10 }}>
                  <span style={{ fontSize: '2rem' }}>{a.icon}</span>
                  <span className="col" style={{ gap: 0, textAlign: 'start' }}>
                    <strong>{t('result.newAch')}</strong>
                    <span>{t(a.titleKey)}</span>
                  </span>
                </div>
              ))}
              <div className="col" style={{ width: '100%', marginTop: 8 }}>
                <button
                  className="btn btn-primary btn-big"
                  onClick={() => {
                    audio.play('tap');
                    setOutcome(null);
                  }}
                  data-testid="result-continue"
                >
                  ▶️ {t('common.continue')}
                </button>
                <div className="row">
                  <button
                    className="btn grow"
                    onClick={() => {
                      setOutcome(null);
                      void managerRef.current?.restart();
                    }}
                    data-testid="result-again"
                  >
                    🔄 {t('result.playAgain')}
                  </button>
                  <button className="btn grow" onClick={exit} data-testid="result-exit">
                    🏠 {t('result.backToWorld')}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

