// Genera los archivos de marca de Wedflow (logotipo con el texto convertido en trazos).
// Uso: node scripts/brand.mjs <ruta a opentype.js>
// opentype.js se usa solo en el diseño; la aplicación no lo necesita.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opentype = (await import(process.argv[2])).default;
const font = (f) => opentype.parse(fs.readFileSync(path.join(root, 'node_modules/@fontsource', f)).buffer);
const serif = font('cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff');
const serifItalic = font('cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff');
const sans = font('manrope/files/manrope-latin-600-normal.woff');

const GOLD_A = '#D2B27A';
const GOLD_B = '#9E7B45';

function mark({ ink = '#1E1B18', id = 'm' } = {}) {
  const sw = 3.4;
  const gap = sw + 3.2;
  return `
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD_A}"/><stop offset="1" stop-color="${GOLD_B}"/>
    </linearGradient>
    <clipPath id="${id}bottom"><rect x="0" y="39" width="64" height="25"/></clipPath>
    <clipPath id="${id}top"><rect x="0" y="0" width="64" height="29"/></clipPath>
    <mask id="${id}ma" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
      <rect width="64" height="64" fill="#fff"/>
      <circle cx="40" cy="35" r="13" fill="none" stroke="#000" stroke-width="${gap}" clip-path="url(#${id}bottom)"/>
    </mask>
    <mask id="${id}mb" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
      <rect width="64" height="64" fill="#fff"/>
      <circle cx="24" cy="35" r="13" fill="none" stroke="#000" stroke-width="${gap}" clip-path="url(#${id}top)"/>
    </mask>
  </defs>
  <circle cx="40" cy="35" r="13" fill="none" stroke="${ink}" stroke-width="${sw}" mask="url(#${id}mb)"/>
  <circle cx="24" cy="35" r="13" fill="none" stroke="url(#${id}g)" stroke-width="${sw}" mask="url(#${id}ma)"/>
  <path d="M32 4.5 C32.6 9.2 34.3 10.9 39 11.5 C34.3 12.1 32.6 13.8 32 18.5 C31.4 13.8 29.7 12.1 25 11.5 C29.7 10.9 31.4 9.2 32 4.5 Z" fill="url(#${id}g)"/>
  <path d="M46.5 7 C46.8 9.1 47.4 9.7 49.5 10 C47.4 10.3 46.8 10.9 46.5 13 C46.2 10.9 45.6 10.3 43.5 10 C45.6 9.7 46.2 9.1 46.5 7 Z" fill="url(#${id}g)" opacity=".75"/>`;
}

function textPath(f, text, x, y, size, letterSpacing = 0) {
  let d = '';
  let cx = x;
  for (const ch of text) {
    const g = f.charToGlyph(ch);
    d += g.getPath(cx, y, size).toPathData(2);
    cx += (g.advanceWidth / f.unitsPerEm) * size + letterSpacing;
  }
  return { d, width: cx - x - letterSpacing };
}

function lockup({ ink = '#1E1B18', sub = '#7A7068', tagline = true, id = 'l' }) {
  const wed = textPath(serif, 'Wed', 74, 44, 44);
  const flow = textPath(serifItalic, 'flow', 74 + wed.width + 1, 44, 44);
  const total = wed.width + 1 + flow.width;
  const tag = tagline ? textPath(sans, 'PLANIFICACIÓN DE PERSONAL', 76, 68, 7.6, 1.55) : null;
  const width = Math.ceil(74 + Math.max(total, tag ? tag.width : 0) + 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${tagline ? 72 : 64}" width="${width * 3}" height="${tagline ? 216 : 192}" role="img" aria-label="Wedflow">
  <title>Wedflow</title>
  <g>${mark({ ink, id })}</g>
  <path d="${wed.d}" fill="${ink}"/>
  <path d="${flow.d}" fill="url(#${id}g)"/>
  ${tag ? `<path d="${tag.d}" fill="${sub}"/>` : ''}
</svg>
`;
}

const icon = (ink, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256" role="img" aria-label="Wedflow">
  <title>Wedflow</title>
  ${bg ? `<rect width="64" height="64" rx="14" fill="${bg}"/>` : ''}
  <g transform="translate(0 1.5)">${mark({ ink, id: 'i' + (bg ? 'b' : '') })}</g>
</svg>
`;

const out = path.join(root, 'public/img');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'logo.svg'), lockup({ id: 'l' }));
fs.writeFileSync(path.join(out, 'logo-light.svg'), lockup({ ink: '#FBF8F3', sub: '#CDBFAE', id: 'k' }));
fs.writeFileSync(path.join(out, 'logo-wordmark.svg'), lockup({ tagline: false, id: 'w' }));
fs.writeFileSync(path.join(out, 'logo-mark.svg'), icon('#1E1B18'));
fs.writeFileSync(path.join(out, 'logo-mark-light.svg'), icon('#FBF8F3'));
fs.writeFileSync(path.join(out, 'favicon.svg'), icon('#FBF8F3', '#1E1B18'));
console.log('Marca generada en', out);
