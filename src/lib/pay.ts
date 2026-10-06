// Règles de calcul de Quart. Tout ce qui touche aux heures et à l'argent est ici.
//
// Règles simplifiées (ce sont des ESTIMATIONS, pas une fiche de paie) :
// - Durée payée d'un poste = fin − début (un poste qui passe minuit est compté
//   jusqu'au lendemain) − pause non payée.
// - Un poste est rattaché au jour où il COMMENCE : c'est ce jour qui décide de la
//   majoration dimanche ou jour férié, pour toute la durée du poste.
// - Si le jour est à la fois un dimanche et un jour férié, seule la majoration
//   « jour férié » s'applique (pas de cumul des deux).
// - Les heures de nuit = part du poste dans la plage de nuit de l'EMPLOYEUR du
//   poste (21:00–06:00 et +20 % par défaut, réglables par employeur). La pause
//   est répartie au prorata sur tout le poste.
// - Heures sup. : comptées par employeur et par mois, au-delà des heures
//   contractuelles, dans l'ordre chronologique. Les « sup1Hours » premières
//   heures sup. sont au palier 1, les suivantes au palier 2. Un employeur avec
//   0 heure contractuelle (intérim sans volume fixe) n'a pas d'heures sup.
// - Les majorations s'additionnent : taux × (1 + sup + nuit + dimanche/férié).
// - Un congé payé compte ses heures forfaitaires, au taux de base, sans
//   majoration ; il compte dans le total des heures du mois.
// - Net estimé = brut × (1 − taux de cotisations).

import type { AppData, Employer, PaySettings, Shift, ShiftType } from './types';
import { addDays, dayOfWeek, parseISO, toISO } from './dates';

/* ---------- Jours fériés français (métropole) ---------- */

/** Dimanche de Pâques (algorithme grégorien anonyme), au format AAAA-MM-JJ. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(year, month, day);
}

const holidayCache = new Map<number, Map<string, string>>();

/** Les 11 jours fériés légaux, date → nom. */
export function frenchHolidays(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const list: [string, string][] = [
    [toISO(year, 1, 1), "Jour de l'an"],
    [addDays(easter, 1), 'Lundi de Pâques'],
    [toISO(year, 5, 1), 'Fête du Travail'],
    [toISO(year, 5, 8), 'Victoire 1945'],
    [addDays(easter, 39), 'Ascension'],
    [addDays(easter, 50), 'Lundi de Pentecôte'],
    [toISO(year, 7, 14), 'Fête nationale'],
    [toISO(year, 8, 15), 'Assomption'],
    [toISO(year, 11, 1), 'Toussaint'],
    [toISO(year, 11, 11), 'Armistice 1918'],
    [toISO(year, 12, 25), 'Noël']
  ];
  const map = new Map(list);
  holidayCache.set(year, map);
  return map;
}

export const holidayName = (date: string) => frenchHolidays(parseISO(date)[0]).get(date);
export const isHoliday = (date: string) => holidayName(date) !== undefined;
export const isSunday = (date: string) => dayOfWeek(date) === 0;

/* ---------- Durées ---------- */

/** Durée entre début et fin, en minutes. Si fin ≤ début, le poste passe minuit. */
export function spanMinutes(start: number, end: number): number {
  return (((end - start) % 1440) + 1440) % 1440;
}

/** Minutes du poste [start, start + span] qui tombent dans la plage de nuit. */
export function nightMinutes(start: number, end: number, nightStart: number, nightEnd: number): number {
  const span = spanMinutes(start, end);
  if (span === 0) return 0;
  const a = start;
  const b = start + span;
  const windowLen = spanMinutes(nightStart, nightEnd) || 1440;
  let total = 0;
  // Plages de nuit de la veille, du jour et du lendemain.
  for (let k = -1; k <= 1; k++) {
    const ws = nightStart + 1440 * k;
    const we = ws + windowLen;
    total += Math.max(0, Math.min(b, we) - Math.max(a, ws));
  }
  return Math.min(total, span);
}

/** Heures payées d'un poste. */
export function paidHours(shift: Pick<Shift, 'start' | 'end' | 'pause'>, type: ShiftType | undefined): number {
  if (!type || type.kind === 'rest') return 0;
  if (type.kind === 'leave') return Math.max(0, type.leaveHours);
  return Math.max(0, spanMinutes(shift.start, shift.end) - shift.pause) / 60;
}

/* ---------- Paie d'un poste ---------- */

export interface ShiftPay {
  hours: number;
  /** Heures de nuit payées. */
  nightHours: number;
  /** Heures sup. au palier 1 et 2. */
  sup1: number;
  sup2: number;
  /** Majoration de jour appliquée : dimanche, férié ou aucune. */
  day: 'sunday' | 'holiday' | null;
  brut: number;
}

export interface OvertimeSplit {
  sup1: number;
  sup2: number;
}

/**
 * Brut d'un poste. `overtime` indique combien de ses heures sont des heures sup.
 * (calculé par computeMonth, car cela dépend des autres postes du mois).
 */
export function shiftPay(
  shift: Shift,
  type: ShiftType | undefined,
  employer: Employer | undefined,
  settings: PaySettings,
  overtime: OvertimeSplit = { sup1: 0, sup2: 0 }
): ShiftPay {
  const hours = paidHours(shift, type);
  const rate = employer?.rate ?? 0;
  const r = settings.rates;
  let nightHours = 0;
  let day: ShiftPay['day'] = null;
  if (type?.kind === 'work' && hours > 0) {
    const span = spanMinutes(shift.start, shift.end);
    if (employer && employer.nightRate > 0) {
      nightHours = hours * (nightMinutes(shift.start, shift.end, employer.nightStart, employer.nightEnd) / span);
    }
    if (isHoliday(shift.date)) day = 'holiday';
    else if (isSunday(shift.date)) day = 'sunday';
  }
  const dayPct = day === 'holiday' ? r.holiday : day === 'sunday' ? r.sunday : 0;
  const brut =
    rate *
    (hours * (1 + dayPct / 100) +
      nightHours * ((employer?.nightRate ?? 0) / 100) +
      overtime.sup1 * (r.sup1 / 100) +
      overtime.sup2 * (r.sup2 / 100));
  return { hours, nightHours, sup1: overtime.sup1, sup2: overtime.sup2, day, brut };
}

/* ---------- Paie du mois ---------- */

export interface MonthSummary {
  /** Heures à travailler (somme des contrats concernés). */
  contractHours: number;
  /** Heures payées jusqu'au jour actuel inclus. */
  doneHours: number;
  /** Heures payées de tout le mois (planning complet). */
  plannedHours: number;
  /** done / contrat, plafonné à 1. */
  ratio: number;
  remainingHours: number;
  brutToDate: number;
  brutPlanned: number;
  netToDate: number;
  netPlanned: number;
  supHours: number;
  /** Détail par poste (clé : id du poste). */
  perShift: Map<string, ShiftPay>;
}

export const net = (brut: number, cotisations: number) => brut * (1 - cotisations / 100);

/**
 * Calcule le mois `year`/`month` (1–12). `today` (AAAA-MM-JJ) sépare le « à date »
 * du « prévu fin de mois ».
 */
export function computeMonth(data: AppData, year: number, month: number, today: string): MonthSummary {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const types = new Map(data.shiftTypes.map((t) => [t.id, t]));
  const employers = new Map(data.employers.map((e) => [e.id, e]));
  const s = data.settings;

  const shifts = data.shifts
    .filter((sh) => sh.date.startsWith(prefix))
    .sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));

  const cumul = new Map<string, number>();
  const perShift = new Map<string, ShiftPay>();
  const usedEmployers = new Set<string>();
  let doneHours = 0;
  let plannedHours = 0;
  let brutToDate = 0;
  let brutPlanned = 0;
  let supHours = 0;

  for (const sh of shifts) {
    const type = types.get(sh.typeId);
    const emp = employers.get(sh.employerId);
    const hours = paidHours(sh, type);
    if (hours > 0) usedEmployers.add(sh.employerId);
    const contract = emp?.contractHours ?? 0;
    const before = cumul.get(sh.employerId) ?? 0;
    const after = before + hours;
    cumul.set(sh.employerId, after);

    // Part du poste au-delà du contrat, répartie entre palier 1 et palier 2.
    // Un employeur sans heures contractuelles (0) ne génère pas d'heures sup.
    const overHours = contract > 0 ? Math.max(0, after - Math.max(before, contract)) : 0;
    const alreadyOver = Math.max(0, before - contract);
    const sup1 = Math.min(overHours, Math.max(0, s.sup1Hours - alreadyOver));
    const sup2 = overHours - sup1;
    supHours += overHours;

    const pay = shiftPay(sh, type, emp, s, { sup1, sup2 });
    perShift.set(sh.id, pay);
    plannedHours += hours;
    brutPlanned += pay.brut;
    if (sh.date <= today) {
      doneHours += hours;
      brutToDate += pay.brut;
    }
  }

  // Heures à travailler : contrats des employeurs du mois (ou le premier employeur).
  if (usedEmployers.size === 0 && data.employers[0]) usedEmployers.add(data.employers[0].id);
  let contractHours = 0;
  for (const id of usedEmployers) contractHours += employers.get(id)?.contractHours ?? 0;

  return {
    contractHours,
    doneHours,
    plannedHours,
    ratio: contractHours > 0 ? Math.min(1, doneHours / contractHours) : 0,
    remainingHours: Math.max(0, contractHours - doneHours),
    brutToDate,
    brutPlanned,
    netToDate: net(brutToDate, s.cotisations),
    netPlanned: net(brutPlanned, s.cotisations),
    supHours,
    perShift
  };
}
