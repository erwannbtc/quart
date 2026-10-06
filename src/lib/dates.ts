// Dates manipulées sous forme de texte AAAA-MM-JJ, calculs en UTC pour éviter
// les décalages d'heure d'été.

export const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function parseISO(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m, d];
}

const utc = (s: string) => {
  const [y, m, d] = parseISO(s);
  return Date.UTC(y, m - 1, d);
};

/** 0 = dimanche, 1 = lundi, … 6 = samedi. */
export const dayOfWeek = (s: string) => new Date(utc(s)).getUTCDay();

export function addDays(s: string, n: number): string {
  const t = new Date(utc(s) + n * 86400000);
  return toISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const diffDays = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86400000);

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Le jour en cours sur l'appareil (heure locale). */
export function todayISO(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Lundi de la semaine contenant ce jour. */
export const mondayOf = (s: string) => addDays(s, -((dayOfWeek(s) + 6) % 7));

export function isValidISO(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parseISO(s);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}
