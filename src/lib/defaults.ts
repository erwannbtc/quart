import type { AppData, Employer, PaySettings, ShiftType } from './types';

export const DEFAULT_SETTINGS: PaySettings = {
  rates: { sup1: 25, sup2: 50, sunday: 50, holiday: 100 },
  sup1Hours: 34.67,
  cotisations: 22
};

/** Majoration de nuit par défaut d'un nouvel employeur : +20 % entre 21:00 et 06:00. */
export const DEFAULT_NIGHT = { nightRate: 20, nightStart: 21 * 60, nightEnd: 6 * 60 };

export const newEmployer = (id: string, name: string, rate: number, contractHours: number): Employer => ({
  id,
  name,
  rate,
  contractHours,
  ...DEFAULT_NIGHT
});

type TypeTemplate = Omit<ShiftType, 'id' | 'employerId'> & { key: string };

/** Postes travaillés proposés à la création d'un employeur. */
export const WORK_TEMPLATES: TypeTemplate[] = [
  { key: 'matin', name: 'Matin', code: 'M', color: '#F5A623', start: 300, end: 780, pause: 30, kind: 'work', leaveHours: 0 },
  { key: 'apres', name: 'Après-midi', code: 'A', color: '#4C8DFF', start: 780, end: 1260, pause: 30, kind: 'work', leaveHours: 0 },
  { key: 'nuit', name: 'Nuit', code: 'N', color: '#9B6DFF', start: 1260, end: 300, pause: 30, kind: 'work', leaveHours: 0 }
];

/** Jours sans travail, communs à tous les employeurs. */
export const COMMON_TYPES: ShiftType[] = [
  { id: 'repos', name: 'Repos', code: '·', color: '#6E788A', start: 0, end: 0, pause: 0, kind: 'rest', leaveHours: 0, employerId: null },
  { id: 'conge', name: 'Congé', code: 'C', color: '#7FCFA5', start: 0, end: 0, pause: 0, kind: 'leave', leaveHours: 7, employerId: null }
];

/** Postes de départ d'un employeur (ids prévisibles : `${employerId}-matin`…). */
export function workTypesFor(employerId: string, keys = ['matin', 'apres', 'nuit']): ShiftType[] {
  return WORK_TEMPLATES.filter((t) => keys.includes(t.key)).map(({ key, ...t }) => ({ ...t, id: `${employerId}-${key}`, employerId }));
}

/** Données de départ : générique, à compléter par l'utilisateur. */
export function defaultData(): AppData {
  return {
    version: 2,
    shiftTypes: [...workTypesFor('emp-1'), ...COMMON_TYPES.map((t) => ({ ...t }))],
    employers: [newEmployer('emp-1', 'Mon employeur', 12, 151.67)],
    shifts: [],
    settings: structuredClone(DEFAULT_SETTINGS)
  };
}

let counter = 0;
/** Identifiant unique (fonctionne aussi hors HTTPS, contrairement à crypto.randomUUID). */
export const newId = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
