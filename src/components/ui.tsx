import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTween } from '../lib/anim';

/* ---------- Icônes (traits simples, reprises du design) ---------- */

const svg = (size: number, children: ReactNode, sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icon = {
  calendar: (s = 21) => svg(s, <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  clock: (s = 21) => svg(s, <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>),
  sliders: (s = 21) => svg(s, <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
  left: (s = 18) => svg(s, <path d="M15 6l-6 6 6 6" />, 2),
  right: (s = 18) => svg(s, <path d="M9 6l6 6-6 6" />, 2),
  plus: (s = 20) => svg(s, <path d="M12 5v14M5 12h14" />, 2.4),
  close: (s = 20) => svg(s, <path d="M6 6l12 12M18 6L6 18" />, 2),
  pencil: (s = 18) => svg(s, <path d="M4 20h4l10.5-10.5-4-4L4 16v4zM13.5 6.5l4 4" />),
  chevron: (s = 16) => svg(s, <path d="M6 9l6 6 6-6" />, 2),
  arrow: (s = 16) => svg(s, <path d="M5 12h14M13 6l6 6-6 6" />, 2),
  download: (s = 18) => svg(s, <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />),
  upload: (s = 18) => svg(s, <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />)
};

export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="0.5" y="0.5" width="27" height="27" rx="8" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.12)" />
      <path d="M8 20 V8 A12 12 0 0 1 20 20 Z" fill="var(--accent)" />
    </svg>
  );
}

/* ---------- Nombre animé ---------- */

export function Tween({ value, format }: { value: number; format: (n: number) => string }) {
  const v = useTween(value);
  return <>{format(v)}</>;
}

/* ---------- Anneau de progression ---------- */

const R = 28;
const C = 2 * Math.PI * R;

export function Ring({ ratio, label }: { ratio: number; label: string }) {
  const r = useTween(ratio);
  return (
    <div className="ring" role="img" aria-label={label}>
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
        <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        {r > 0.001 && (
          <circle cx="34" cy="34" r={R} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - r)} />
        )}
      </svg>
      <div className="pct" aria-hidden="true">{Math.round(r * 100)} %</div>
    </div>
  );
}

/* ---------- Feuille qui monte du bas ---------- */

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(onClose, 260);
    return () => window.clearTimeout(t);
  }, [closing, onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setClosing(true);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // La barre d'onglets s'efface tant qu'une feuille est ouverte.
    document.body.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.classList.remove('sheet-open');
      prev?.focus?.();
    };
  }, []);

  // Rendue directement dans <body> : rien (barre d'onglets comprise) ne peut passer devant.
  return createPortal(
    <>
      <div className={`scrim${closing ? ' closing' : ''}`} onClick={close} aria-hidden="true" />
      <div ref={ref} className={`sheet${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" style={{ marginRight: -10 }} aria-label="Fermer" onClick={close}>
            {Icon.close()}
          </button>
        </div>
        {children(close)}
      </div>
    </>,
    document.body
  );
}

/* ---------- Steppers ---------- */

export function Stepper({ value, onDec, onInc, label, decDisabled, incDisabled }: {
  value: string;
  onDec: () => void;
  onInc: () => void;
  label: string;
  decDisabled?: boolean;
  incDisabled?: boolean;
}) {
  return (
    <div className="stepper">
      <button onClick={onDec} disabled={decDisabled} aria-label={`Baisser : ${label}`}>−</button>
      <div className="v" aria-live="polite">{value}</div>
      <button onClick={onInc} disabled={incDisabled} aria-label={`Augmenter : ${label}`}>+</button>
    </div>
  );
}

export function VStepper({ label, value, onDec, onInc, decLabel, incLabel, disabled }: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  decLabel: string;
  incLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="vstep">
      <div className="k">{label}</div>
      <div className="v" aria-live="polite">{value}</div>
      <div className="b">
        <button onClick={onDec} aria-label={decLabel} disabled={disabled}>−</button>
        <button onClick={onInc} aria-label={incLabel} disabled={disabled}>+</button>
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
      <span className="track"><span className="knob" /></span>
    </button>
  );
}

/* ---------- Champ date : bouton stylé qui ouvre le sélecteur natif ---------- */

export function DateField({ value, onChange, label, display }: { value: string; onChange: (v: string) => void; label: string; display: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  return (
    <div className="picker">
      <button type="button" className="fieldbtn" onClick={open} aria-label={`${label} : ${display}. Modifier`}>
        <span>{display}</span>
        <span className="muted">{Icon.calendar(18)}</span>
      </button>
      <input ref={ref} type="date" tabIndex={-1} aria-hidden="true" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </div>
  );
}

/* ---------- Message éphémère ---------- */

let toastMsg: { text: string; id: number } | null = null;
const toastListeners = new Set<() => void>();
let toastTimer = 0;

export function toast(text: string) {
  toastMsg = { text, id: Date.now() };
  toastListeners.forEach((l) => l());
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMsg = null;
    toastListeners.forEach((l) => l());
  }, 2800);
}

export function Toast() {
  const msg = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => {
        toastListeners.delete(l);
      };
    },
    () => toastMsg
  );
  return (
    <div aria-live="polite" role="status">
      {msg && <div key={msg.id} className="toast">{msg.text}</div>}
    </div>
  );
}
