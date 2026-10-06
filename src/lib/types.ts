/** Nature d'un type de poste : travaillé, repos (0 h) ou congé payé (heures forfaitaires). */
export type ShiftKind = 'work' | 'rest' | 'leave';

export interface ShiftType {
  id: string;
  name: string;
  /** Lettre affichée dans le calendrier (M, A, N…). */
  code: string;
  color: string;
  /** Minutes depuis minuit. */
  start: number;
  end: number;
  /** Pause non payée, en minutes. */
  pause: number;
  kind: ShiftKind;
  /** Heures payées pour un congé. */
  leaveHours: number;
}

export interface Employer {
  id: string;
  name: string;
  /** Taux horaire brut, en euros. */
  rate: number;
  /** Heures contractuelles par mois. */
  contractHours: number;
}

export interface Shift {
  id: string;
  /** Jour où le poste COMMENCE, au format AAAA-MM-JJ. */
  date: string;
  typeId: string;
  start: number;
  end: number;
  pause: number;
  employerId: string;
}

/** Majorations en pourcentage (25 = +25 %). */
export interface Rates {
  sup1: number;
  sup2: number;
  night: number;
  sunday: number;
  holiday: number;
}

export interface PaySettings {
  rates: Rates;
  /** Nombre d'heures sup. payées au palier 1 chaque mois, avant le palier 2. */
  sup1Hours: number;
  /** Plage de nuit, en minutes depuis minuit. */
  nightStart: number;
  nightEnd: number;
  /** Taux de cotisations salariales, en pourcentage. */
  cotisations: number;
}

export interface AppData {
  version: 1;
  shiftTypes: ShiftType[];
  employers: Employer[];
  shifts: Shift[];
  settings: PaySettings;
}
