// Teintes des postes (voir quart-design/tokens.json).

/** Texte lisible posé sur la teinte d'un poste, tel que défini dans le design. */
const TEXT_ON_TINT: Record<string, string> = {
  '#F5A623': '#F7BC5C',
  '#4C8DFF': '#8DB6FF',
  '#9B6DFF': '#BDA0FF',
  '#6E788A': '#9AA3B4',
  '#7FCFA5': '#9BDCB9'
};

/** Couleurs proposées pour un type de poste. */
export const SHIFT_COLORS = ['#F5A623', '#4C8DFF', '#9B6DFF', '#6E788A', '#7FCFA5', '#3FC8D8', '#F06A9B', '#E8D44D'];

export function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export const tint = (hex: string, alpha: number) => `rgba(${rgb(hex)},${alpha})`;

/** Couleur du texte sur teinte : valeur du design, sinon la couleur éclaircie de 30 %. */
export function textOn(hex: string): string {
  const known = TEXT_ON_TINT[hex.toUpperCase()];
  if (known) return known;
  const [r, g, b] = rgb(hex).split(',').map(Number);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.3).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}
