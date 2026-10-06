// Mode démo : données 100 % FICTIVES, pour filmer l'app sans données personnelles.
import type { AppData, Shift } from './types';
import { DEFAULT_SETTINGS, DEFAULT_TYPES } from './defaults';
import { addDays, dayOfWeek, daysInMonth, diffDays, mondayOf, toISO } from './dates';

export interface DemoData extends AppData {
  /** « Aujourd'hui » simulé : le 15 du mois de la démo. */
  today: string;
}

/**
 * Planning 2x8 fictif sur le mois précédent, le mois choisi et le suivant :
 * semaines alternées matin / après-midi du lundi au vendredi, repos le week-end,
 * un jour de congé vers le 23 du mois choisi.
 */
export function buildDemo(year: number, month: number): DemoData {
  const first = toISO(year, month, 1);
  const anchor = mondayOf(first);
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1];
  const next = month === 12 ? [year + 1, 1] : [year, month + 1];
  const start = toISO(prev[0], prev[1], 1);
  const end = toISO(next[0], next[1], daysInMonth(next[0], next[1]));

  let leave = toISO(year, month, 23);
  while (dayOfWeek(leave) === 0 || dayOfWeek(leave) === 6) leave = addDays(leave, -1);

  const shifts: Shift[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dow = dayOfWeek(d);
    const week = Math.floor(diffDays(anchor, d) / 7);
    let typeId = ((week % 2) + 2) % 2 === 0 ? 'matin' : 'apres';
    if (dow === 0 || dow === 6) typeId = 'repos';
    if (d === leave) typeId = 'conge';
    const t = DEFAULT_TYPES.find((x) => x.id === typeId)!;
    shifts.push({ id: `demo-${d}`, date: d, typeId, start: t.start, end: t.end, pause: t.pause, employerId: 'demo-emp' });
  }

  return {
    version: 1,
    shiftTypes: DEFAULT_TYPES.map((t) => ({ ...t })),
    employers: [{ id: 'demo-emp', name: 'Atelier Nord', rate: 14.2, contractHours: 151.67 }],
    shifts,
    settings: structuredClone(DEFAULT_SETTINGS),
    today: toISO(year, month, 15)
  };
}
