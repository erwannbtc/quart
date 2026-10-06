import { describe, expect, it } from 'vitest';
import {
  computeMonth,
  easterSunday,
  frenchHolidays,
  isHoliday,
  nightMinutes,
  paidHours,
  shiftPay,
  spanMinutes
} from './pay';
import { COMMON_TYPES, defaultData, DEFAULT_SETTINGS, workTypesFor } from './defaults';
import { validateData } from './validate';
import { buildDemo } from './demo';
import type { AppData, Employer, Shift } from './types';

const TYPES = [...workTypesFor('e'), ...COMMON_TYPES];
const type = (key: string) => TYPES.find((t) => t.id === key || t.id === `e-${key}`)!;
const emp: Employer = { id: 'e', name: 'Test', rate: 14.2, contractHours: 151.67 };
const S = DEFAULT_SETTINGS;

function shift(date: string, typeId: string, over: Partial<Shift> = {}): Shift {
  const t = type(typeId);
  return { id: `${date}-${typeId}`, date, typeId: t.id, start: t.start, end: t.end, pause: t.pause, employerId: 'e', ...over };
}

function data(shifts: Shift[], employers: Employer[] = [emp]): AppData {
  return { ...defaultData(), shiftTypes: TYPES, employers, shifts };
}

describe('durées', () => {
  it('poste de jour : fin − début − pause', () => {
    expect(spanMinutes(300, 780)).toBe(480);
    expect(paidHours(shift('2026-10-05', 'matin'), type('matin'))).toBe(7.5);
  });

  it('poste de nuit qui passe minuit (21:00 → 05:00)', () => {
    expect(spanMinutes(1260, 300)).toBe(480);
    expect(paidHours(shift('2026-10-05', 'nuit'), type('nuit'))).toBe(7.5);
  });

  it('repos = 0 h, congé = heures forfaitaires', () => {
    expect(paidHours(shift('2026-10-05', 'repos'), type('repos'))).toBe(0);
    expect(paidHours(shift('2026-10-05', 'conge'), type('conge'))).toBe(7);
  });

  it('heures de nuit dans la plage 21:00–06:00', () => {
    expect(nightMinutes(1260, 300, 1260, 360)).toBe(480); // 21:00 → 05:00 : tout est de nuit
    expect(nightMinutes(1320, 390, 1260, 360)).toBe(480); // 22:00 → 06:30 : 8 h sur 8 h 30
    expect(nightMinutes(300, 780, 1260, 360)).toBe(60); // 05:00 → 13:00 : 1 h
    expect(nightMinutes(780, 1260, 1260, 360)).toBe(0); // 13:00 → 21:00 : rien
  });
});

describe('majorations', () => {
  it('poste de nuit en semaine : +20 % sur les heures de nuit', () => {
    const p = shiftPay(shift('2026-10-06', 'nuit'), type('nuit'), emp, S);
    expect(p.nightHours).toBeCloseTo(7.5);
    expect(p.day).toBeNull();
    expect(p.brut).toBeCloseTo(7.5 * 14.2 * 1.2, 6); // 127,80 €
  });

  it('pause répartie au prorata pour les heures de nuit', () => {
    // 22:00 → 06:30, pause 30 min : 8 h payées, dont 8 × 480/510 de nuit
    const p = shiftPay(shift('2026-10-06', 'nuit', { start: 1320, end: 390 }), type('nuit'), emp, S);
    expect(p.hours).toBe(8);
    expect(p.nightHours).toBeCloseTo((8 * 480) / 510, 6);
  });

  it('dimanche : +50 % sur tout le poste', () => {
    const p = shiftPay(shift('2026-10-04', 'apres'), type('apres'), emp, S);
    expect(p.day).toBe('sunday');
    expect(p.brut).toBeCloseTo(7.5 * 14.2 * 1.5, 6); // 159,75 €
  });

  it('poste rattaché au jour où il commence (samedi soir → dimanche matin = pas de dimanche)', () => {
    const sat = shiftPay(shift('2026-10-03', 'nuit'), type('nuit'), emp, S);
    expect(sat.day).toBeNull();
    const sun = shiftPay(shift('2026-10-04', 'nuit'), type('nuit'), emp, S);
    expect(sun.day).toBe('sunday');
    expect(sun.brut).toBeCloseTo(7.5 * 14.2 * (1 + 0.5 + 0.2), 6);
  });

  it('jour férié : +100 %', () => {
    const p = shiftPay(shift('2026-07-14', 'matin', { start: 360, end: 840 }), type('matin'), emp, S);
    expect(p.day).toBe('holiday');
    expect(p.brut).toBeCloseTo(7.5 * 14.2 * 2, 6);
  });

  it('férié un dimanche : seule la majoration férié s’applique', () => {
    // 1er novembre 2026 = dimanche
    const p = shiftPay(shift('2026-11-01', 'apres'), type('apres'), emp, S);
    expect(p.day).toBe('holiday');
    expect(p.brut).toBeCloseTo(7.5 * 14.2 * 2, 6);
  });

  it('congé : pas de majoration de jour ni de nuit', () => {
    const p = shiftPay(shift('2026-12-25', 'conge'), type('conge'), emp, S);
    expect(p.day).toBeNull();
    expect(p.brut).toBeCloseTo(7 * 14.2, 6);
  });
});

describe('jours fériés', () => {
  it('Pâques', () => {
    expect(easterSunday(2024)).toBe('2024-03-31');
    expect(easterSunday(2025)).toBe('2025-04-20');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
  });

  it('les 11 jours fériés de 2026, y compris ceux basés sur Pâques', () => {
    const h = frenchHolidays(2026);
    expect(h.size).toBe(11);
    expect(h.get('2026-04-06')).toBe('Lundi de Pâques');
    expect(h.get('2026-05-14')).toBe('Ascension');
    expect(h.get('2026-05-25')).toBe('Lundi de Pentecôte');
    for (const d of ['2026-01-01', '2026-05-01', '2026-05-08', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25']) {
      expect(isHoliday(d)).toBe(true);
    }
    expect(isHoliday('2026-10-15')).toBe(false);
  });
});

describe('heures supplémentaires', () => {
  it('au-delà du contrat : palier 1 puis palier 2', () => {
    // 25 postes de 8 h = 200 h → 48,33 h sup : 34,67 à +25 %, 13,66 à +50 %
    const shifts: Shift[] = [];
    for (let d = 1; d <= 25; d++) {
      shifts.push(shift(`2026-03-${String(d).padStart(2, '0')}`, 'apres', { start: 780, end: 1290 })); // 13:00–21:30, pause 30
    }
    // Mars 2026 n'a pas de jour férié ; les dimanches et la demi-heure de nuit s'ajoutent.
    const d = data(shifts);
    const sundays = shifts.filter((s) => new Date(s.date + 'T12:00:00Z').getUTCDay() === 0).length;
    const m = computeMonth(d, 2026, 3, '2026-03-31');
    expect(m.plannedHours).toBeCloseTo(200);
    expect(m.supHours).toBeCloseTo(200 - 151.67);
    const night = 25 * 0.5 * (8 / 8.5) * 14.2 * 0.2; // 21:00–21:30 est de nuit
    const sunday = sundays * 8 * 14.2 * 0.5;
    const expected = 200 * 14.2 + 34.67 * 14.2 * 0.25 + (200 - 151.67 - 34.67) * 14.2 * 0.5 + night + sunday;
    expect(m.brutPlanned).toBeCloseTo(expected, 6);
  });

  it('pas d’heures sup. tant que le contrat n’est pas dépassé', () => {
    const m = computeMonth(data([shift('2026-10-05', 'matin'), shift('2026-10-06', 'matin')]), 2026, 10, '2026-10-31');
    expect(m.supHours).toBe(0);
  });

  it('employeur sans heures contractuelles : pas d’heures sup.', () => {
    const interim: Employer = { id: 'i', name: 'Intérim', rate: 12, contractHours: 0 };
    const m = computeMonth(data([shift('2026-10-05', 'apres', { employerId: 'i' })], [interim]), 2026, 10, '2026-10-31');
    expect(m.supHours).toBe(0);
    expect(m.brutPlanned).toBeCloseTo(7.5 * 12, 6);
  });

  it('heures sup. calculées par employeur', () => {
    const other: Employer = { id: 'f', name: 'Autre', rate: 10, contractHours: 7.5 };
    const shifts = [shift('2026-10-05', 'apres', { employerId: 'f' }), shift('2026-10-06', 'apres', { employerId: 'f' })];
    const m = computeMonth(data(shifts, [emp, other]), 2026, 10, '2026-10-31');
    expect(m.supHours).toBeCloseTo(7.5);
    expect(m.contractHours).toBeCloseTo(7.5);
    expect(m.brutPlanned).toBeCloseTo(15 * 10 + 7.5 * 10 * 0.25, 6);
  });
});

describe('mois incomplet et à date', () => {
  it('le « à date » s’arrête au jour actuel inclus', () => {
    const shifts = [shift('2026-10-14', 'matin'), shift('2026-10-15', 'matin'), shift('2026-10-16', 'matin')];
    const m = computeMonth(data(shifts), 2026, 10, '2026-10-15');
    expect(m.doneHours).toBe(15);
    expect(m.plannedHours).toBe(22.5);
    expect(m.remainingHours).toBeCloseTo(151.67 - 15);
  });

  it('mois sans poste : tout à zéro, contrat du premier employeur', () => {
    const m = computeMonth(data([]), 2026, 2, '2026-02-10');
    expect(m.doneHours).toBe(0);
    expect(m.brutPlanned).toBe(0);
    expect(m.ratio).toBe(0);
    expect(m.contractHours).toBe(151.67);
  });

  it('les postes des autres mois sont ignorés', () => {
    const m = computeMonth(data([shift('2026-09-30', 'matin'), shift('2026-11-01', 'matin')]), 2026, 10, '2026-10-31');
    expect(m.plannedHours).toBe(0);
  });

  it('un mois futur n’a rien « à date »', () => {
    const m = computeMonth(data([shift('2026-12-01', 'matin')]), 2026, 12, '2026-10-06');
    expect(m.doneHours).toBe(0);
    expect(m.plannedHours).toBe(7.5);
  });

  it('pourcentage plafonné à 100 %', () => {
    const small: Employer = { ...emp, contractHours: 10 };
    const m = computeMonth(data([shift('2026-10-05', 'matin'), shift('2026-10-06', 'matin')], [small]), 2026, 10, '2026-10-31');
    expect(m.ratio).toBe(1);
    expect(m.remainingHours).toBe(0);
  });

  it('net estimé = brut × (1 − cotisations)', () => {
    const m = computeMonth(data([shift('2026-10-05', 'apres')]), 2026, 10, '2026-10-31');
    expect(m.netPlanned).toBeCloseTo(m.brutPlanned * 0.78, 6);
  });
});

describe('mode démo (octobre 2026, aujourd’hui le 15)', () => {
  it('reproduit les chiffres de la maquette', () => {
    const demo = buildDemo(2026, 10);
    expect(demo.today).toBe('2026-10-15');
    const m = computeMonth(demo, 2026, 10, demo.today);
    expect(m.doneHours).toBeCloseTo(82.5);
    // La maquette donne 1 171,50 € (82,5 h × 14,20) mais oublie que le poste du
    // matin (05:00–13:00) a 1 h dans la plage de nuit 21:00–06:00 : 6 matins à date.
    const nightBonus = (n: number) => n * 7.5 * (60 / 480) * 14.2 * 0.2;
    expect(m.brutToDate).toBeCloseTo(1171.5 + nightBonus(6), 6);
    expect(m.netToDate).toBeCloseTo((1171.5 + nightBonus(6)) * 0.78, 6);
    // Prévu : 164,5 h dont 12,83 h sup. à +25 %, plus 12 matins avec 1 h de nuit.
    expect(m.brutPlanned).toBeCloseTo(151.67 * 14.2 + (164.5 - 151.67) * 14.2 * 1.25 + nightBonus(12), 6);
  });

  it('ne contient que l’employeur fictif', () => {
    const demo = buildDemo(2026, 10);
    expect(demo.employers.map((e) => e.name)).toEqual(['Atelier Nord']);
  });
});

describe('sauvegardes', () => {
  it('convertit une sauvegarde au format 1 : chaque employeur reçoit ses postes', () => {
    const v1 = {
      version: 1,
      shiftTypes: [
        { id: 'matin', name: 'Matin', code: 'M', color: '#F5A623', start: 300, end: 780, pause: 30, kind: 'work', leaveHours: 0 },
        { id: 'repos', name: 'Repos', code: '·', color: '#6E788A', start: 0, end: 0, pause: 0, kind: 'rest', leaveHours: 0 }
      ],
      employers: [
        { id: 'a', name: 'A', rate: 12, contractHours: 151.67 },
        { id: 'b', name: 'B', rate: 13, contractHours: 0 }
      ],
      shifts: [
        { id: 's1', date: '2026-10-05', typeId: 'matin', start: 300, end: 780, pause: 30, employerId: 'a' },
        { id: 's2', date: '2026-10-06', typeId: 'matin', start: 300, end: 780, pause: 30, employerId: 'b' },
        { id: 's3', date: '2026-10-07', typeId: 'repos', start: 0, end: 0, pause: 0, employerId: 'b' }
      ],
      settings: DEFAULT_SETTINGS
    };
    const d = validateData(v1)!;
    expect(d.version).toBe(2);
    expect(d.shiftTypes.find((t) => t.id === 'matin')!.employerId).toBe('a');
    expect(d.shiftTypes.find((t) => t.id === 'repos')!.employerId).toBeNull();
    const copy = d.shiftTypes.find((t) => t.employerId === 'b')!;
    expect(copy.name).toBe('Matin');
    expect(d.shifts.find((s) => s.id === 's2')!.typeId).toBe(copy.id);
    expect(d.shifts.find((s) => s.id === 's3')!.typeId).toBe('repos');
  });

  it('refuse un fichier étranger', () => {
    expect(validateData({ hello: 1 })).toBeNull();
    expect(validateData({ version: 3, shiftTypes: [], employers: [], shifts: [] })).toBeNull();
  });

  it('les données de départ sont valides', () => {
    expect(validateData(defaultData())).not.toBeNull();
    expect(validateData(buildDemo(2026, 10))).not.toBeNull();
  });
});
