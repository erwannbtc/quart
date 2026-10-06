// Vérifie un fichier importé (ou le contenu du localStorage) avant de l'utiliser.
import type { AppData, Employer, Shift, ShiftKind, ShiftType } from './types';
import { DEFAULT_SETTINGS } from './defaults';
import { isValidISO } from './dates';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min = -Infinity, max = Infinity): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const minutes = (v: unknown): v is number => num(v, 0, 1439);
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const KINDS: ShiftKind[] = ['work', 'rest', 'leave'];

function shiftType(x: unknown): ShiftType | null {
  // employerId est vérifié plus bas (il doit désigner un employeur existant).
  if (!isObj(x) || !str(x.id) || !str(x.name, 40) || !str(x.code, 3) || !isColor(x.color)) return null;
  if (!minutes(x.start) || !minutes(x.end) || !num(x.pause, 0, 600)) return null;
  if (!KINDS.includes(x.kind as ShiftKind)) return null;
  return {
    id: x.id,
    name: x.name,
    code: x.code,
    color: x.color,
    start: x.start,
    end: x.end,
    pause: x.pause,
    kind: x.kind as ShiftKind,
    leaveHours: num(x.leaveHours, 0, 24) ? x.leaveHours : 0,
    employerId: typeof x.employerId === 'string' ? x.employerId : null
  };
}

function employer(x: unknown): Employer | null {
  if (!isObj(x) || !str(x.id) || !str(x.name, 80) || !num(x.rate, 0, 1000) || !num(x.contractHours, 0, 744)) return null;
  return { id: x.id, name: x.name, rate: x.rate, contractHours: x.contractHours };
}

function shift(x: unknown): Shift | null {
  if (!isObj(x) || !str(x.id) || !isValidISO(x.date) || !str(x.typeId) || !str(x.employerId)) return null;
  if (!minutes(x.start) || !minutes(x.end) || !num(x.pause, 0, 600)) return null;
  return { id: x.id, date: x.date, typeId: x.typeId, start: x.start, end: x.end, pause: x.pause, employerId: x.employerId };
}

function all<T>(list: unknown[], fn: (x: unknown) => T | null): T[] | null {
  const out: T[] = [];
  for (const x of list) {
    const v = fn(x);
    if (!v) return null;
    out.push(v);
  }
  return out;
}

/**
 * Renvoie des données propres (format 2), ou null si le contenu n'est pas un
 * fichier Quart valide. Les sauvegardes au format 1 (postes communs à tous les
 * employeurs) sont converties : chaque employeur reçoit sa copie des postes.
 */
export function validateData(x: unknown): AppData | null {
  if (!isObj(x) || (x.version !== 1 && x.version !== 2)) return null;
  if (!Array.isArray(x.shiftTypes) || !Array.isArray(x.employers) || !Array.isArray(x.shifts)) return null;
  let shiftTypes = all(x.shiftTypes, shiftType);
  const employers = all(x.employers, employer);
  let shifts = all(x.shifts, shift);
  if (!shiftTypes?.length || !employers?.length || !shifts) return null;
  const empIds = new Set(employers.map((e) => e.id));
  const firstEmp = employers[0].id;

  if (x.version === 1) {
    const work = shiftTypes.filter((t) => t.kind === 'work');
    const copies: ShiftType[] = [];
    const remap = new Map<string, string>(); // `${employé}|${type}` → type copié
    for (const e of employers.slice(1)) {
      for (const t of work) {
        const id = `${t.id}~${e.id}`;
        copies.push({ ...t, id, employerId: e.id });
        remap.set(`${e.id}|${t.id}`, id);
      }
    }
    shiftTypes = [
      ...shiftTypes.map((t) => ({ ...t, employerId: t.kind === 'work' ? firstEmp : null })),
      ...copies
    ];
    shifts = shifts.map((s) => ({ ...s, typeId: remap.get(`${s.employerId}|${s.typeId}`) ?? s.typeId }));
  } else {
    // Un poste travaillé doit appartenir à un employeur existant.
    shiftTypes = shiftTypes.map((t) => {
      if (t.employerId !== null && !empIds.has(t.employerId)) return { ...t, employerId: t.kind === 'work' ? firstEmp : null };
      if (t.employerId === null && t.kind === 'work') return { ...t, employerId: firstEmp };
      return t;
    });
  }

  const typeIds = new Set(shiftTypes.map((t) => t.id));
  if (shifts.some((s) => !typeIds.has(s.typeId) || !empIds.has(s.employerId))) return null;

  const s = isObj(x.settings) ? x.settings : {};
  const r = isObj(s.rates) ? s.rates : {};
  const D = DEFAULT_SETTINGS;
  const pct = (v: unknown, d: number) => (num(v, 0, 500) ? v : d);
  return {
    version: 2,
    shiftTypes,
    employers,
    shifts,
    settings: {
      rates: {
        sup1: pct(r.sup1, D.rates.sup1),
        sup2: pct(r.sup2, D.rates.sup2),
        night: pct(r.night, D.rates.night),
        sunday: pct(r.sunday, D.rates.sunday),
        holiday: pct(r.holiday, D.rates.holiday)
      },
      sup1Hours: num(s.sup1Hours, 0, 744) ? s.sup1Hours : D.sup1Hours,
      nightStart: minutes(s.nightStart) ? s.nightStart : D.nightStart,
      nightEnd: minutes(s.nightEnd) ? s.nightEnd : D.nightEnd,
      cotisations: num(s.cotisations, 0, 100) ? s.cotisations : D.cotisations
    }
  };
}
