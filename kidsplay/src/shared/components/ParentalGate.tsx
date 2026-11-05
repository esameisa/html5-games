import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui';

export function makeGateQuestion(rng: () => number = Math.random): { a: number; b: number; answer: number } {
  // Two-digit × one-digit multiplication: easy for adults, hard for young children.
  const a = 11 + Math.floor(rng() * 15);
  const b = 3 + Math.floor(rng() * 7);
  return { a, b, answer: a * b };
}

/**
 * Age-appropriate parental gate used before the parents area and any external link.
 * Requires typing the answer on a custom keypad (no OS keyboard, works in RTL).
 */
export function ParentalGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState(() => makeGateQuestion());
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const keys = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'], []);

  const press = (k: string) => {
    setError(false);
    if (k === '⌫') return setValue((v) => v.slice(0, -1));
    if (k === '✓') {
      if (Number(value) === q.answer) return onPass();
      setError(true);
      setValue('');
      setQ(makeGateQuestion());
      return;
    }
    setValue((v) => (v.length < 4 ? v + k : v));
  };

  return (
    <Modal onClose={onCancel} labelledBy="gate-title">
      <div className="col" style={{ alignItems: 'center', textAlign: 'center' }} dir="ltr">
        <h2 id="gate-title" className="subtitle">
          🔒 {t('gate.title')}
        </h2>
        <p className="muted small" style={{ margin: 0 }}>
          {t('gate.prompt')}
        </p>
        <p className="title" data-testid="gate-question">
          {t('gate.question', { a: q.a, b: q.b })}
        </p>
        <div className="pill" style={{ fontSize: '1.8rem', minWidth: 140, justifyContent: 'center', minHeight: 52 }} aria-live="polite">
          {value || ' '}
        </div>
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', margin: 0, fontWeight: 800 }}>
            {t('gate.wrong')}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 10 }}>
          {keys.map((k) => (
            <button key={k} className={`btn ${k === '✓' ? 'btn-success' : ''}`} onClick={() => press(k)} aria-label={k === '⌫' ? 'delete' : k === '✓' ? 'submit' : k}>
              {k}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );
}
