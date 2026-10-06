// Mise en forme à la française : 1 234,56 €.
import { dayOfWeek, parseISO } from './dates';

const cache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number) {
  const key = `${min}-${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

/** Nombre avec un nombre fixe de décimales. */
export const fmt = (n: number, digits = 2) => nf(digits, digits).format(Math.abs(n) < 1e-9 ? 0 : n);
export const euro = (n: number, digits = 2) => `${fmt(n, digits)} €`;

/** Heures : « 82,5 », « 151,67 », « 7 » (sans zéros inutiles). */
export const hours = (n: number, max = 2) => nf(0, max).format(Math.abs(n) < 1e-9 ? 0 : n);

/** 7,5 → « 7 h 30 » */
export function duration(h: number) {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`;
}

/** Minutes depuis minuit → « 05:00 » */
export function hm(m: number) {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}

/** « 05:30 » → 330 ; null si invalide. */
export function parseHM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

/** « 14,20 » ou « 14.20 » → 14.2 ; null si invalide. */
export function parseDecimal(s: string): number | null {
  const clean = s.replace(/[\s  €%h]/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  return Number(clean);
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthName = (m: number) => MONTHS[m - 1];
export const monthTitle = (y: number, m: number) => `${cap(MONTHS[m - 1])} ${y}`;

/** « Samedi 17 octobre 2026 » */
export function longDate(iso: string) {
  const [y, m, d] = parseISO(iso);
  return `${cap(DAYS[dayOfWeek(iso)])} ${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`;
}

/** « 17 octobre » */
export function dayMonth(iso: string) {
  const [, m, d] = parseISO(iso);
  return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]}`;
}

/** « jeu. 15 » */
export const shortDay = (iso: string) => `${DAYS_SHORT[dayOfWeek(iso)]} ${parseISO(iso)[2]}`;
