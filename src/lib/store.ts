// Stockage 100 % local (localStorage). Les vraies données et celles du mode démo
// sont rangées sous deux clés différentes : la démo ne touche jamais aux vraies.
import { useSyncExternalStore } from 'react';
import type { AppData } from './types';
import { defaultData } from './defaults';
import { buildDemo, type DemoData } from './demo';
import { parseISO, todayISO } from './dates';
import { validateData } from './validate';

const KEY_DATA = 'quart.data.v1';
const KEY_DEMO = 'quart.demo.v1';
const KEY_MODE = 'quart.mode';

export interface StoreState {
  mode: 'real' | 'demo';
  real: AppData;
  demo: DemoData | null;
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou bloqué : l'app continue en mémoire */
  }
}

function load(): StoreState {
  const real = validateData(read(KEY_DATA)) ?? defaultData();
  const demoRaw = read(KEY_DEMO) as { today?: unknown } | null;
  const demoValid = demoRaw ? validateData(demoRaw) : null;
  const demo = demoValid && typeof demoRaw?.today === 'string' ? { ...demoValid, today: demoRaw.today } : null;
  const mode = read(KEY_MODE) === 'demo' && demo ? 'demo' : 'real';
  return { mode, real, demo };
}

let state: StoreState = load();
const listeners = new Set<() => void>();

function set(next: StoreState) {
  if (next.real !== state.real) write(KEY_DATA, next.real);
  if (next.demo !== state.demo) write(KEY_DEMO, next.demo);
  if (next.mode !== state.mode) write(KEY_MODE, next.mode);
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useStore = () => useSyncExternalStore(subscribe, () => state);

/** Données affichées (démo ou vraies). */
export const activeData = (s: StoreState): AppData => (s.mode === 'demo' && s.demo ? s.demo : s.real);

/** « Aujourd'hui » : simulé au 15 du mois en mode démo. */
export const activeToday = (s: StoreState) => (s.mode === 'demo' && s.demo ? s.demo.today : todayISO());

/** Modifie les données affichées (en démo, seule la copie démo change). */
export function update(fn: (d: AppData) => AppData) {
  if (state.mode === 'demo' && state.demo) {
    const next = fn(state.demo);
    set({ ...state, demo: { ...next, today: state.demo.today } });
  } else {
    set({ ...state, real: fn(state.real) });
  }
}

export function startDemo() {
  const [y, m] = parseISO(todayISO());
  set({ ...state, mode: 'demo', demo: buildDemo(y, m) });
}

export function stopDemo() {
  set({ ...state, mode: 'real', demo: null });
}

/** Remplace les vraies données (import). */
export function replaceRealData(d: AppData) {
  set({ ...state, real: d });
}

export function resetRealData() {
  set({ ...state, real: defaultData() });
}

export const getRealData = () => state.real;
