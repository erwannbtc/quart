import type { AppData, PaySettings, ShiftType } from './types';

export const DEFAULT_SETTINGS: PaySettings = {
  rates: { sup1: 25, sup2: 50, night: 20, sunday: 50, holiday: 100 },
  sup1Hours: 34.67,
  nightStart: 21 * 60,
  nightEnd: 6 * 60,
  cotisations: 22
};

export const DEFAULT_TYPES: ShiftType[] = [
  { id: 'matin', name: 'Matin', code: 'M', color: '#F5A623', start: 300, end: 780, pause: 30, kind: 'work', leaveHours: 0 },
  { id: 'apres', name: 'Après-midi', code: 'A', color: '#4C8DFF', start: 780, end: 1260, pause: 30, kind: 'work', leaveHours: 0 },
  { id: 'nuit', name: 'Nuit', code: 'N', color: '#9B6DFF', start: 1260, end: 300, pause: 30, kind: 'work', leaveHours: 0 },
  { id: 'repos', name: 'Repos', code: '·', color: '#6E788A', start: 0, end: 0, pause: 0, kind: 'rest', leaveHours: 0 },
  { id: 'conge', name: 'Congé', code: 'C', color: '#7FCFA5', start: 0, end: 0, pause: 0, kind: 'leave', leaveHours: 7 }
];

/** Données de départ : générique, à compléter par l'utilisateur. */
export function defaultData(): AppData {
  return {
    version: 1,
    shiftTypes: DEFAULT_TYPES.map((t) => ({ ...t })),
    employers: [{ id: 'emp-1', name: 'Mon employeur', rate: 12, contractHours: 151.67 }],
    shifts: [],
    settings: structuredClone(DEFAULT_SETTINGS)
  };
}

let counter = 0;
/** Identifiant unique (fonctionne aussi hors HTTPS, contrairement à crypto.randomUUID). */
export const newId = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
