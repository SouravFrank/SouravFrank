#!/usr/bin/env node
/**
 * generate-awards.mjs
 *
 * Renders decorative SVG cards for the Honors and Certifications sections.
 * Static content from the README; no API calls. Emits light + dark variants.
 *   - assets/honors-{light,dark}.svg
 *   - assets/certifications-{light,dark}.svg
 *
 * Usage: node scripts/generate-awards.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const OUT_DIR = join(REPO_ROOT, 'assets');

const FONT = "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bracketPaths(x, y, w, h, len = 10) {
  return `M${x} ${y} l0 ${-len} l${len} 0 M${x + w} ${y} l0 ${-len} l${-len} 0 M${x} ${y + h} l0 ${len} l${len} 0 M${x + w} ${y + h} l0 ${len} l${-len} 0`;
}

function glowText({ x, y, size, weight, anchor = 'middle', text, core, glow, font = FONT }) {
  const sh = (dx) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${glow}" opacity="0.45" transform="translate(${dx} 0)">${text}</text>`;
  return `<g>${sh(-1.1)}${sh(1.1)}${sh(0)}<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${core}">${text}</text></g>`;
}

function sparkles(seeds, color, size = 4) {
  const star = (cx, cy, s) => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? s : s * 0.38;
      const a = (Math.PI / 4) * i - Math.PI / 2;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${color}" opacity="0.8"/>`;
  };
  return seeds.map(([cx, cy, s]) => star(cx, cy, s || size)).join('');
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const PAL = {
  light: {
    bg0: '#f6f7ff',
    bg1: '#e9edfb',
    hairline: 'rgba(20,30,80,0.07)',
    panel: 'rgba(255,255,255,0.78)',
    panelStroke: 'rgba(59,59,214,0.22)',
    text: '#1b2240',
    subtext: '#5a6a96',
    faint: '#8b96b8',
    accentFrom: '#3b3bd6',
    accentTo: '#61DAFB',
    glow: 'rgba(97,218,251,0.5)',
    gold: '#c9971f',
    goldSoft: 'rgba(201,151,31,0.14)',
    silver: '#7c8aa0',
    silverSoft: 'rgba(124,138,160,0.14)',
    bronze: '#c07f4a',
    bronzeSoft: 'rgba(192,127,74,0.14)',
  },
  dark: {
    bg0: '#070b16',
    bg1: '#0e162c',
    hairline: 'rgba(120,160,255,0.06)',
    panel: 'rgba(13,20,40,0.72)',
    panelStroke: 'rgba(97,218,251,0.28)',
    text: '#e6f1ff',
    subtext: '#8aa0cc',
    faint: '#55648a',
    accentFrom: '#61DAFB',
    accentTo: '#8b5cf6',
    glow: 'rgba(56,189,248,0.5)',
    gold: '#f5c542',
    goldSoft: 'rgba(245,197,66,0.12)',
    silver: '#c8d2e0',
    silverSoft: 'rgba(200,210,224,0.12)',
    bronze: '#dfa878',
    bronzeSoft: 'rgba(223,168,120,0.12)',
  },
};

// ---------------------------------------------------------------------------
// Honors
// ---------------------------------------------------------------------------

const HONORS = [
  { year: '2024', name: 'Employee of the Year Award', org: 'Fareportal', term: 'Q4 2024', tier: 'gold' },
  { year: '2024', name: 'Ownership and Accountability Award', org: 'Fareportal', term: 'Q1 2024', tier: 'silver' },
  { year: '2023', name: 'Fast Execution Award', org: 'Fareportal', term: 'Q2 2023', tier: 'bronze' },
  { year: '2022', name: 'Fast Execution Award', org: 'Fareportal', term: 'Q2 2022', tier: 'bronze' },
  { year: '2021', name: 'Passion For Customers Award', org: 'Fareportal', term: 'Q4 2021', tier: 'silver' },
  { year: '2020', name: 'Technical Excellence Award', org: 'TCS', term: 'June 2020', tier: 'gold' },
  { year: '2019', name: 'Technical Finesse Award', org: 'Narula Institute of Technology', term: '2019', tier: 'bronze' },
];

const TIER_STARS = { gold: 3, silver: 2, bronze: 1 };

function renderHonors(p) {
  const W = 1000;
  const H = 600;
  const gid = 'hgrad';
  const parts = [];

  parts.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  for (let x = 28; x <= 972; x += 80) {
    parts.push(`<line x1="${x}" y1="118" x2="${x}" y2="${H - 24}" stroke="${p.hairline}" stroke-width="1"/>`);
  }
  for (let y = 118; y <= 576; y += 60) {
    parts.push(`<line x1="28" y1="${y}" x2="972" y2="${y}" stroke="${p.hairline}" stroke-width="1"/>`);
  }

  // header
  parts.push(`<text x="70" y="88" font-family="${FONT}" font-size="34" font-weight="800" fill="${p.text}">🏆</text>`);
  parts.push(`<text x="132" y="66" font-family="${FONT}" font-size="26" font-weight="800" letter-spacing="5" fill="${p.text}">HALL OF FAME</text>`);
  parts.push(`<text x="134" y="88" font-family="${FONT}" font-size="12" fill="${p.subtext}">${esc('Honors & Accolades · 2019 – 2024')}</text>`);
  parts.push(`<line x1="28" y1="112" x2="972" y2="112" stroke="url(#${gid})" stroke-width="2" opacity="0.8"/>`);

  // rows
  HONORS.forEach((a, i) => {
    const y = 148 + i * 62;
    const tierColor = p[a.tier];
    const tierSoft = p[a.tier + 'Soft'];
    const stars = TIER_STARS[a.tier];

    parts.push(`<rect x="88" y="${y - 22}" width="58" height="26" rx="13" fill="${tierSoft}" stroke="${tierColor}" stroke-width="1.2"/>`);
    parts.push(`<text x="117" y="${y - 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="${tierColor}">${a.year}</text>`);

    // medal diamond
    parts.push(`<g transform="translate(180 ${y - 6}) rotate(45)"><rect x="-11" y="-11" width="22" height="22" rx="5" fill="${tierColor}" opacity="0.95"/><rect x="-5" y="-5" width="10" height="10" rx="2.5" fill="${p.panel}"/></g>`);

    parts.push(`<text x="212" y="${y - 2}" font-family="${FONT}" font-size="16" font-weight="700" fill="${p.text}">${esc(a.name)}</text>`);
    parts.push(`<text x="212" y="${y + 18}" font-family="${FONT}" font-size="11.5" fill="${p.subtext}">${esc(a.org)} · ${esc(a.term)}</text>`);

    // star rating
    let rating = '';
    for (let s = 0; s < 3; s++) {
      rating += `<polygon points="${(820 + s * 26).toFixed(1)},${(y - 22).toFixed(1)} ${(823 + s * 26).toFixed(1)},${(y - 13).toFixed(1)} ${(832 + s * 26).toFixed(1)},${(y - 13).toFixed(1)} ${(825 + s * 26).toFixed(1)},${(y - 7).toFixed(1)} ${(827 + s * 26).toFixed(1)},${(y - 1).toFixed(1)} ${(820 + s * 26).toFixed(1)},${(y - 6).toFixed(1)} ${(813 + s * 26).toFixed(1)},${(y - 1).toFixed(1)} ${(815 + s * 26).toFixed(1)},${(y - 7).toFixed(1)} ${(808 + s * 26).toFixed(1)},${(y - 13).toFixed(1)} ${(817 + s * 26).toFixed(1)},${(y - 13).toFixed(1)} ${(820 + s * 26).toFixed(1)},${(y - 22).toFixed(1)}" fill="${s < stars ? tierColor : p.hairline}"/>`;
    }
    parts.push(rating);

    if (i < HONORS.length - 1) {
      parts.push(`<line x1="88" y1="${y + 32}" x2="912" y2="${y + 32}" stroke="${p.hairline}" stroke-width="1"/>`);
    }
  });

  parts.push(sparkles([[950, 70, 5], [50, 560, 4], [958, 540, 6]], p.accentTo));

  const body = parts.join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Honors: ${HONORS.map((a) => `${a.name}, ${a.org}, ${a.year}`).join('; ')}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg0}"/><stop offset="100%" stop-color="${p.bg1}"/>
    </linearGradient>
    <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.accentFrom}"/><stop offset="100%" stop-color="${p.accentTo}"/>
    </linearGradient>
  </defs>
  ${body}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

const CERTS = [
  { name: 'Claude Certified Architect — Foundations', org: 'Anthropic' },
  { name: 'Claude Certified Developer — Foundations', org: 'Anthropic' },
  { name: 'OpenAI Consultative Solutions Practitioner', org: 'OpenAI' },
  { name: 'OpenAI Technical Practitioner', org: 'OpenAI' },
  { name: 'OpenAI Foundational Knowledge', org: 'OpenAI' },
  { name: 'Prompt Engineering for ChatGPT', org: 'Vanderbilt University · Coursera · Sep 2023' },
];

function renderCertifications(p) {
  const W = 1000;
  const H = 520;
  const gid = 'cgrad';
  const parts = [];

  parts.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  parts.push(`<rect x="28" y="24" width="944" height="472" rx="18" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>`);
  parts.push(`<rect x="40" y="36" width="920" height="448" rx="14" fill="none" stroke="url(#${gid})" stroke-width="1.4" stroke-dasharray="6 6" opacity="0.65"/>`);
  parts.push(`<path d="${bracketPaths(28, 24, 944, 472, 14)}" fill="none" stroke="${p.accentTo}" stroke-width="1.5" opacity="0.7"/>`);

  // watermark
  parts.push(`<text x="500" y="320" text-anchor="middle" font-family="${FONT}" font-size="180" font-weight="800" fill="${p.accentFrom}" opacity="0.045">VU</text>`);

  // header
  parts.push(`<text x="76" y="82" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="3" fill="${p.accentTo}">VERIFIED CREDENTIALS</text>`);
  parts.push(`<text x="76" y="112" font-family="${FONT}" font-size="24" font-weight="800" fill="${p.text}">Certifications</text>`);
  parts.push(`<line x1="76" y1="126" x2="260" y2="126" stroke="url(#${gid})" stroke-width="2.5"/>`);

  // rows
  CERTS.forEach((c, i) => {
    const y = 166 + i * 48;
    parts.push(`<rect x="76" y="${y - 18}" width="8" height="8" rx="2" fill="url(#${gid})"/>`);
    parts.push(`<text x="96" y="${y - 6}" font-family="${FONT}" font-size="14.5" font-weight="600" fill="${p.text}">${esc(c.name)}</text>`);
    parts.push(`<text x="96" y="${y + 12}" font-family="${FONT}" font-size="11" fill="${p.subtext}">${esc(c.org)}</text>`);
    if (i < CERTS.length - 1) {
      parts.push(`<line x1="96" y1="${y + 22}" x2="924" y2="${y + 22}" stroke="${p.hairline}" stroke-width="1"/>`);
    }
  });

  // seal
  const sx = 780;
  const sy = 260;
  parts.push(`<circle cx="${sx}" cy="${sy}" r="62" fill="${p.panel}" stroke="url(#${gid})" stroke-width="1.6"/>`);
  parts.push(`<circle cx="${sx}" cy="${sy}" r="54" fill="none" stroke="${p.accentTo}" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"/>`);
  parts.push(`<defs><path id="sealarc" d="M ${sx - 46} ${sy} a 46 46 0 1 1 92 0 a 46 46 0 1 1 -92 0"/></defs>`);
  parts.push(`<text font-size="10" letter-spacing="2.5" fill="${p.subtext}"><textPath href="#sealarc">CERTIFIED · VERIFIED · CERTIFIED ·</textPath></text>`);
  parts.push(`<path d="M ${sx - 14} ${sy + 2} l 10 10 l 24 -26" fill="none" stroke="url(#${gid})" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`);
  // ribbons
  parts.push(`<g transform="translate(${sx} ${sy + 66})"><rect x="-42" y="-8" width="84" height="16" rx="5" fill="url(#${gid})" opacity="0.92" transform="rotate(12)"/><rect x="-42" y="-8" width="84" height="16" rx="5" fill="url(#${gid})" opacity="0.92" transform="rotate(-12)"/></g>`);

  parts.push(sparkles([[sx - 78, sy - 70, 5], [sx + 76, sy + 78, 4], [906, 80, 4]], p.accentTo));
  parts.push(`<text x="924" y="472" text-anchor="end" font-family="${FONT}" font-size="10" letter-spacing="2" fill="${p.faint}">ISSUED · GITHUB PROFILE</text>`);

  const body = parts.join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Certifications: ${CERTS.map((c) => `${c.name}, ${c.org}`).join('; ')}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg0}"/><stop offset="100%" stop-color="${p.bg1}"/>
    </linearGradient>
    <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.accentFrom}"/><stop offset="100%" stop-color="${p.accentTo}"/>
    </linearGradient>
  </defs>
  ${body}
</svg>
`;
}

// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
const outputs = [
  ['honors', renderHonors(PAL.light), renderHonors(PAL.dark)],
  ['certifications', renderCertifications(PAL.light), renderCertifications(PAL.dark)],
];

for (const [base, light, dark] of outputs) {
  writeFileSync(join(OUT_DIR, `${base}-light.svg`), light, 'utf8');
  writeFileSync(join(OUT_DIR, `${base}-dark.svg`), dark, 'utf8');
  console.log(`wrote ${base}-{light,dark}.svg (${light.length}/${dark.length} bytes)`);
}
