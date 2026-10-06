// Génère les icônes PNG de la PWA à partir de public/icon.svg (à lancer une seule fois : npm run icons).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg');
const maskable = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0B0E13"/><path d="M176 336 V176 A160 160 0 0 1 336 336 Z" fill="#2BD67B"/></svg>'
);
await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(svg).resize(180, 180).flatten({ background: '#0B0E13' }).png().toFile('public/apple-touch-icon.png');
await sharp(maskable).resize(512, 512).png().toFile('public/icon-maskable-512.png');
console.log('Icônes générées dans public/');
