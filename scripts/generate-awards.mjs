#!/usr/bin/env node
/**
 * generate-awards.mjs
 *
 * Renders decorative Bento SVG cards for the Honors and Certifications sections.
 * Matches the Telemetry dashboard visual language and emits light + dark variants:
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

// ---------------------------------------------------------------------------
// Palettes (aligned with telemetry-{light,dark}.svg)
// ---------------------------------------------------------------------------

const PAL = {
  light: {
    bg0: '#f5f7ff',
    bg1: '#e8eefc',
    outerStroke: 'rgba(59,59,214,0.18)',
    ambientA: 'rgba(56,189,248,0.16)',
    ambientB: 'rgba(99,102,241,0.12)',
    hairline: 'rgba(30,41,99,0.045)',
    panel: 'rgba(255,255,255,0.88)',
    panelStroke: 'rgba(59,59,214,0.16)',
    divider: 'rgba(30,41,99,0.08)',
    text: '#0f172a',
    subtext: '#475569',
    faint: '#64748b',
    accentFrom: '#2563eb',
    accentTo: '#7c3aed',
    liveDot: '#0284c7',
    gold: '#b45309',
    goldSoft: 'rgba(217,119,6,0.12)',
    goldStroke: 'rgba(217,119,6,0.38)',
    silver: '#475569',
    silverSoft: 'rgba(100,116,139,0.12)',
    silverStroke: 'rgba(100,116,139,0.34)',
    bronze: '#9a3412',
    bronzeSoft: 'rgba(194,65,12,0.11)',
    bronzeStroke: 'rgba(194,65,12,0.34)',
    anthropic: '#c2410c',
    openai: '#059669',
    vanderbilt: '#2563eb',
  },
  dark: {
    bg0: '#060a14',
    bg1: '#0c1326',
    outerStroke: 'rgba(97,218,251,0.22)',
    ambientA: 'rgba(56,189,248,0.13)',
    ambientB: 'rgba(139,92,246,0.15)',
    hairline: 'rgba(120,160,255,0.045)',
    panel: 'rgba(13,21,42,0.78)',
    panelStroke: 'rgba(97,218,251,0.20)',
    divider: 'rgba(148,163,184,0.12)',
    text: '#eef4ff',
    subtext: '#8ba2cf',
    faint: '#5d719c',
    accentFrom: '#38bdf8',
    accentTo: '#a855f7',
    liveDot: '#22d3ee',
    gold: '#fbbf24',
    goldSoft: 'rgba(251,191,36,0.12)',
    goldStroke: 'rgba(251,191,36,0.40)',
    silver: '#cbd5e1',
    silverSoft: 'rgba(203,213,225,0.11)',
    silverStroke: 'rgba(203,213,225,0.34)',
    bronze: '#fb923c',
    bronzeSoft: 'rgba(251,146,60,0.12)',
    bronzeStroke: 'rgba(251,146,60,0.36)',
    anthropic: '#f59e0b',
    openai: '#34d399',
    vanderbilt: '#38bdf8',
  },
};

function frameHeader(W, H, p, gid, leftLabel, rightLabel) {
  const parts = [];
  parts.push(`<g clip-path="url(#outerClip)">`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  parts.push(`<circle cx="140" cy="60" r="240" fill="url(#orbA)"/>`);
  parts.push(`<circle cx="940" cy="${H - 40}" r="260" fill="url(#orbB)"/>`);
  for (let x = 28; x <= W - 28; x += 64) {
    parts.push(`<line x1="${x}" y1="54" x2="${x}" y2="${H - 16}" stroke="${p.hairline}" stroke-width="1"/>`);
  }
  for (let y = 70; y <= H - 16; y += 64) {
    parts.push(`<line x1="28" y1="${y}" x2="${W - 28}" y2="${y}" stroke="${p.hairline}" stroke-width="1"/>`);
  }
  parts.push(`</g>`);
  parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${p.outerStroke}" stroke-width="1"/>`);
  parts.push(`<circle cx="34" cy="31" r="3.5" fill="${p.liveDot}"/><circle cx="34" cy="31" r="7" fill="none" stroke="${p.liveDot}" stroke-width="1" opacity="0.4"/>`);
  parts.push(`<text x="49" y="35" font-family="${FONT}" font-size="10.5" font-weight="700" letter-spacing="2.2" fill="${p.text}">${esc(leftLabel)}</text>`);
  parts.push(`<text x="${W - 28}" y="35" text-anchor="end" font-family="${FONT}" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="${p.subtext}">${esc(rightLabel)}</text>`);
  parts.push(`<line x1="28" y1="50" x2="${W - 28}" y2="50" stroke="url(#${gid})" stroke-width="1.5" opacity="0.65"/>`);
  return parts;
}

function svgWrap(W, H, p, gid, ariaLabel, parts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">
  <defs>
    <clipPath id="outerClip"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg0}"/><stop offset="100%" stop-color="${p.bg1}"/>
    </linearGradient>
    <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.accentFrom}"/><stop offset="100%" stop-color="${p.accentTo}"/>
    </linearGradient>
    <radialGradient id="orbA" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.ambientA}"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="orbB" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.ambientB}"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  ${parts.join('\n  ')}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Honors
// ---------------------------------------------------------------------------

const HONORS = [
  { year: '2024', name: 'Employee of the Year Award', org: 'Fareportal', term: 'Q4 2024', tier: 'gold' },
  { year: '2024', name: 'Ownership and Accountability Award', org: 'Fareportal', term: 'Q1 2024', tier: 'silver' },
  { year: '2020', name: 'Technical Excellence Award', org: 'Tata Consultancy Services', term: 'Jun 2020', tier: 'gold' },
  { year: '2021', name: 'Passion For Customers Award', org: 'Fareportal', term: 'Q4 2021', tier: 'silver' },
  { year: '2023', name: 'Fast Execution Award', org: 'Fareportal', term: 'Q2 2023', tier: 'bronze' },
  { year: '2022', name: 'Fast Execution Award', org: 'Fareportal', term: 'Q2 2022', tier: 'bronze' },
  { year: '2019', name: 'Technical Finesse Award', org: 'Narula Institute of Technology', term: '2019', tier: 'bronze' },
];

function renderHonors(p) {
  const W = 1060;
  const H = 394;
  const gid = 'hgrad';
  const parts = frameHeader(W, H, p, gid, 'RECOGNITION TIMELINE · 2019 – 2024', '7 HONORS · 2 GOLD · 2 SILVER · 3 BRONZE');

  const tierStyle = (tier) => ({
    color: p[tier],
    soft: p[`${tier}Soft`],
    stroke: p[`${tier}Stroke`],
    label: tier.toUpperCase(),
  });

  // Featured hero award (full width 1004 x 74)
  const hero = HONORS[0];
  const ht = tierStyle(hero.tier);
  const hx = 28;
  const hy = 66;
  const hw = 1004;
  const hh = 74;
  parts.push(
    `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="14" fill="${p.panel}" stroke="${ht.stroke}" stroke-width="1.1"/>`,
    `<line x1="${hx + 18}" y1="${hy + 0.75}" x2="${hx + 140}" y2="${hy + 0.75}" stroke="${ht.color}" stroke-width="2.5" stroke-linecap="round"/>`,
    `<circle cx="${hx + 36}" cy="${hy + 37}" r="16" fill="${ht.soft}" stroke="${ht.stroke}" stroke-width="1"/>`,
    `<g transform="translate(${hx + 36} ${hy + 37}) rotate(45)"><rect x="-6.5" y="-6.5" width="13" height="13" rx="2.5" fill="${ht.color}"/><rect x="-2.5" y="-2.5" width="5" height="5" rx="1" fill="${p.panel}"/></g>`,
    `<text x="${hx + 66}" y="${hy + 32}" font-family="${FONT}" font-size="16" font-weight="800" fill="${p.text}">${esc(hero.name)}</text>`,
    `<text x="${hx + 66}" y="${hy + 52}" font-family="${FONT}" font-size="11.5" fill="${p.subtext}">${esc(hero.org)} · ${esc(hero.term)}</text>`,
    `<rect x="${hx + hw - 118}" y="${hy + 23}" width="98" height="28" rx="14" fill="${ht.soft}" stroke="${ht.stroke}" stroke-width="1"/>`,
    `<text x="${hx + hw - 69}" y="${hy + 41}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="800" letter-spacing="1.2" fill="${ht.color}">${hero.year} · ${ht.label}</text>`,
  );

  // Remaining 6 awards in balanced 2x3 Bento grid
  const rest = HONORS.slice(1);
  const cw = 494;
  const ch = 64;
  rest.forEach((a, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const px = 28 + col * (cw + 16);
    const py = 156 + row * (ch + 12);
    const t = tierStyle(a.tier);

    parts.push(
      `<rect x="${px}" y="${py}" width="${cw}" height="${ch}" rx="13" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>`,
      `<line x1="${px + 18}" y1="${py + 0.75}" x2="${px + 84}" y2="${py + 0.75}" stroke="${t.color}" stroke-width="2" stroke-linecap="round"/>`,
      `<g transform="translate(${px + 28} ${py + 32}) rotate(45)"><rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="${t.soft}" stroke="${t.stroke}" stroke-width="1.2"/><rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" fill="${t.color}"/></g>`,
      `<text x="${px + 50}" y="${py + 28}" font-family="${FONT}" font-size="13.5" font-weight="700" fill="${p.text}">${esc(a.name)}</text>`,
      `<text x="${px + 50}" y="${py + 46}" font-family="${FONT}" font-size="11" fill="${p.subtext}">${esc(a.org)} · ${esc(a.term)}</text>`,
      `<rect x="${px + cw - 102}" y="${py + 20}" width="84" height="24" rx="12" fill="${t.soft}" stroke="${t.stroke}" stroke-width="1"/>`,
      `<text x="${px + cw - 60}" y="${py + 35.5}" text-anchor="middle" font-family="${FONT}" font-size="9.5" font-weight="700" letter-spacing="0.8" fill="${t.color}">${a.year} · ${t.label}</text>`,
    );
  });

  const aria = `Honors: ${HONORS.map((a) => `${a.name} (${a.org}, ${a.term})`).join('; ')}`;
  return svgWrap(W, H, p, gid, aria, parts);
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

const CERT_GROUPS = [
  {
    issuer: 'ANTHROPIC',
    meta: '2 CREDENTIALS',
    accentKey: 'anthropic',
    certs: [
      { name: 'Claude Certified Architect — Foundations', tag: 'ARCHITECT' },
      { name: 'Claude Certified Developer — Foundations', tag: 'DEVELOPER' },
    ],
  },
  {
    issuer: 'OPENAI',
    meta: '3 CREDENTIALS',
    accentKey: 'openai',
    certs: [
      { name: 'OpenAI Consultative Solutions Practitioner', tag: 'SOLUTIONS' },
      { name: 'OpenAI Technical Practitioner', tag: 'TECHNICAL' },
      { name: 'OpenAI Foundational Knowledge', tag: 'FOUNDATIONS' },
    ],
  },
  {
    issuer: 'VANDERBILT UNIVERSITY',
    meta: 'COURSERA · SEP 2023',
    accentKey: 'vanderbilt',
    certs: [
      { name: 'Prompt Engineering for ChatGPT', tag: 'VERIFIED' },
    ],
  },
];

function renderCertifications(p) {
  const W = 1060;
  const H = 298;
  const gid = 'cgrad';
  const parts = frameHeader(W, H, p, gid, 'VERIFIED CREDENTIALS · 3 ISSUERS', '6 CERTIFICATIONS');

  const checkBadge = (cx, cy, color) =>
    `<circle cx="${cx}" cy="${cy}" r="9" fill="${color}" opacity="0.16"/>` +
    `<circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.7"/>` +
    `<path d="M${cx - 3.8} ${cy + 0.3} l2.6 2.7 l5.2 -5.5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

  const renderGroupCard = (px, py, pw, ph, group, firstYOffset, rowStep) => {
    const color = p[group.accentKey];
    parts.push(
      `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="14" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>`,
      `<line x1="${px + 18}" y1="${py + 0.75}" x2="${px + 104}" y2="${py + 0.75}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`,
      `<circle cx="${px + 24}" cy="${py + 22}" r="4" fill="${color}"/>`,
      `<text x="${px + 36}" y="${py + 26}" font-family="${FONT}" font-size="10.5" font-weight="800" letter-spacing="1.8" fill="${p.text}">${esc(group.issuer)}</text>`,
      `<text x="${px + pw - 20}" y="${py + 26}" text-anchor="end" font-family="${FONT}" font-size="9" font-weight="700" letter-spacing="1" fill="${p.faint}">${esc(group.meta)}</text>`,
      `<line x1="${px + 20}" y1="${py + 38}" x2="${px + pw - 20}" y2="${py + 38}" stroke="${p.divider}" stroke-width="1"/>`,
    );

    group.certs.forEach((c, i) => {
      const ry = py + firstYOffset + i * rowStep;
      parts.push(
        checkBadge(px + 29, ry - 4, color),
        `<text x="${px + 48}" y="${ry}" font-family="${FONT}" font-size="13" font-weight="600" fill="${p.text}">${esc(c.name)}</text>`,
        `<text x="${px + pw - 20}" y="${ry}" text-anchor="end" font-family="${FONT}" font-size="8.5" font-weight="700" letter-spacing="1" fill="${color}" opacity="0.9">${esc(c.tag)}</text>`,
      );
      if (i < group.certs.length - 1) {
        parts.push(`<line x1="${px + 48}" y1="${ry + Math.round(rowStep / 2)}" x2="${px + pw - 20}" y2="${ry + Math.round(rowStep / 2)}" stroke="${p.divider}" stroke-width="0.8"/>`);
      }
    });
  };

  // Left column (494px): Anthropic (118px) + 12px gap + Vanderbilt (80px) = 210px
  renderGroupCard(28, 66, 494, 118, CERT_GROUPS[0], 64, 34);
  renderGroupCard(28, 196, 494, 80, CERT_GROUPS[2], 62, 32);

  // Right column (494px): OpenAI (full height 210px)
  renderGroupCard(538, 66, 494, 210, CERT_GROUPS[1], 68, 52);

  const allCerts = CERT_GROUPS.flatMap((g) => g.certs.map((c) => `${c.name} (${g.issuer})`));
  return svgWrap(W, H, p, gid, `Certifications: ${allCerts.join('; ')}`, parts);
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

const EDUCATION = [
  {
    degree: 'Bachelor of Technology',
    school: 'Narula Institute of Technology',
    fieldLabel: 'STREAM',
    field: 'Electronics & Communication Engineering',
    period: '2015 – 2019',
    accentKey: 'accentFrom',
  },
  {
    degree: 'Higher Secondary Education',
    school: 'Shibpur Dinobandhu Institution (Branch)',
    fieldLabel: 'STREAM',
    field: 'Computer Science',
    period: '2013 – 2015',
    accentKey: 'accentTo',
  },
  {
    degree: 'Secondary Education',
    school: 'Shibpur Dinobandhu Institution (Branch)',
    fieldLabel: 'INITIATED TECH JOURNEY',
    field: 'Basic computer literacy & logical thinking',
    period: '2013 · INIT',
    accentKey: 'openai',
  },
];

function renderEducation(p) {
  const W = 1060;
  const H = 296;
  const gid = 'egrad';
  const parts = frameHeader(W, H, p, gid, 'ACADEMIC TIMELINE · 2013 – 2019', '3 MILESTONES · GIT INIT');

  // Vertical git-commit timeline rail
  const railX = 48;
  const cardX = 76;
  const cardW = 956;
  const cardH = 62;
  const firstY = 66;
  const rowStep = 74;
  const firstCy = firstY + cardH / 2;
  const lastCy = firstY + (EDUCATION.length - 1) * rowStep + cardH / 2;

  parts.push(`<line x1="${railX}" y1="${firstCy}" x2="${railX}" y2="${lastCy}" stroke="url(#${gid})" stroke-width="2" opacity="0.55"/>`);

  EDUCATION.forEach((ed, i) => {
    const py = firstY + i * rowStep;
    const cy = py + cardH / 2;
    const color = p[ed.accentKey];
    const pillW = 96;

    // Git commit node + horizontal connector tick
    parts.push(
      `<line x1="${railX}" y1="${cy}" x2="${cardX}" y2="${cy}" stroke="${color}" stroke-width="1.5" opacity="0.55"/>`,
      `<circle cx="${railX}" cy="${cy}" r="8" fill="${p.bg1}" stroke="${color}" stroke-width="2"/>`,
      `<circle cx="${railX}" cy="${cy}" r="3.5" fill="${color}"/>`,
    );

    // Milestone card
    parts.push(
      `<rect x="${cardX}" y="${py}" width="${cardW}" height="${cardH}" rx="13" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>`,
      `<line x1="${cardX + 18}" y1="${py + 0.75}" x2="${cardX + 96}" y2="${py + 0.75}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`,
      `<text x="${cardX + 22}" y="${py + 27}" font-family="${FONT}" font-size="14" font-weight="800" fill="${p.text}">${esc(ed.degree)}</text>`,
      `<text x="${cardX + 22}" y="${py + 46}" font-family="${FONT}" font-size="11.5" fill="${p.subtext}">${esc(ed.school)}</text>`,
      `<line x1="${cardX + 368}" y1="${py + 14}" x2="${cardX + 368}" y2="${py + cardH - 14}" stroke="${p.divider}" stroke-width="1"/>`,
      `<text x="${cardX + 392}" y="${py + 23}" font-family="${FONT}" font-size="8.5" font-weight="700" letter-spacing="1.3" fill="${p.faint}">${esc(ed.fieldLabel)}</text>`,
      `<text x="${cardX + 392}" y="${py + 44}" font-family="${FONT}" font-size="12.5" font-weight="600" fill="${p.text}">${esc(ed.field)}</text>`,
      `<rect x="${cardX + cardW - pillW - 18}" y="${py + 19}" width="${pillW}" height="24" rx="12" fill="${color}" opacity="0.14"/>`,
      `<rect x="${cardX + cardW - pillW - 18}" y="${py + 19}" width="${pillW}" height="24" rx="12" fill="none" stroke="${color}" stroke-width="1" opacity="0.55"/>`,
      `<text x="${cardX + cardW - pillW / 2 - 18}" y="${py + 34.5}" text-anchor="middle" font-family="${FONT}" font-size="9.5" font-weight="800" letter-spacing="0.8" fill="${color}">${esc(ed.period)}</text>`,
    );
  });

  const aria = `Education: ${EDUCATION.map((e) => `${e.degree}, ${e.school} (${e.period}) — ${e.field}`).join('; ')}`;
  return svgWrap(W, H, p, gid, aria, parts);
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

const ARTIFACTS = [
  {
    eyebrow: 'RESUME · PDF / WEB',
    title: 'Senior Frontend Engineer CV',
    desc: 'Experience, architecture impact & release leadership',
    url: 'souravfrank.github.io/about-me/#cv ↗',
    accentKey: 'accentFrom',
    icon: 'doc',
  },
  {
    eyebrow: 'ARTICLES · ENGINEERING NOTES',
    title: 'Technical Writing & Deep Dives',
    desc: 'React Native, mobile architecture & modern JS patterns',
    url: 'souravfrank.github.io/about-me/#articles ↗',
    accentKey: 'accentTo',
    icon: 'pen',
  },
];

function renderArtifacts(p) {
  const W = 1060;
  const H = 192;
  const gid = 'fgrad';
  const parts = frameHeader(W, H, p, gid, 'DOCUMENTS & PUBLICATIONS · ABOUT-ME', '2 ARTIFACTS');

  const cw = 494;
  const ch = 108;
  const cy = 66;

  ARTIFACTS.forEach((item, i) => {
    const px = 28 + i * (cw + 16);
    const color = p[item.accentKey];
    const icx = px + 36;
    const icy = cy + 54;

    parts.push(
      `<rect x="${px}" y="${cy}" width="${cw}" height="${ch}" rx="14" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>`,
      `<line x1="${px + 18}" y1="${cy + 0.75}" x2="${px + 116}" y2="${cy + 0.75}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`,
      `<circle cx="${icx}" cy="${icy}" r="20" fill="${color}" opacity="0.14"/>`,
      `<circle cx="${icx}" cy="${icy}" r="20" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5"/>`,
    );

    if (item.icon === 'doc') {
      parts.push(
        `<path d="M${icx - 7} ${icy - 9} h9 l5 5 v13 a1.5 1.5 0 0 1 -1.5 1.5 h-12.5 a1.5 1.5 0 0 1 -1.5 -1.5 v-15.5 a1.5 1.5 0 0 1 1.5 -1.5 z" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/>`,
        `<path d="M${icx + 2} ${icy - 9} v5 h5" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/>`,
        `<line x1="${icx - 4}" y1="${icy + 1}" x2="${icx + 4}" y2="${icy + 1}" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`,
        `<line x1="${icx - 4}" y1="${icy + 5}" x2="${icx + 2}" y2="${icy + 5}" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`,
      );
    } else {
      parts.push(
        `<path d="M${icx - 7} ${icy + 7} l1.5 -5 l9 -9 a2 2 0 0 1 2.8 2.8 l-9 9 z" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/>`,
        `<line x1="${icx - 7}" y1="${icy + 10}" x2="${icx + 7}" y2="${icy + 10}" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`,
      );
    }

    parts.push(
      `<text x="${px + 72}" y="${cy + 27}" font-family="${FONT}" font-size="8.5" font-weight="800" letter-spacing="1.4" fill="${color}">${esc(item.eyebrow)}</text>`,
      `<text x="${px + 72}" y="${cy + 49}" font-family="${FONT}" font-size="15.5" font-weight="800" fill="${p.text}">${esc(item.title)}</text>`,
      `<text x="${px + 72}" y="${cy + 69}" font-family="${FONT}" font-size="11.5" fill="${p.subtext}">${esc(item.desc)}</text>`,
      `<text x="${px + 72}" y="${cy + 90}" font-family="${FONT}" font-size="10" font-weight="600" fill="${p.faint}">${esc(item.url)}</text>`,
    );
  });

  const aria = `Artifacts: ${ARTIFACTS.map((a) => `${a.title} — ${a.desc}`).join('; ')}`;
  return svgWrap(W, H, p, gid, aria, parts);
}

// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
const outputs = [
  ['honors', renderHonors(PAL.light), renderHonors(PAL.dark)],
  ['certifications', renderCertifications(PAL.light), renderCertifications(PAL.dark)],
  ['education', renderEducation(PAL.light), renderEducation(PAL.dark)],
  ['artifacts', renderArtifacts(PAL.light), renderArtifacts(PAL.dark)],
];

for (const [base, light, dark] of outputs) {
  writeFileSync(join(OUT_DIR, `${base}-light.svg`), light, 'utf8');
  writeFileSync(join(OUT_DIR, `${base}-dark.svg`), dark, 'utf8');
  console.log(`wrote ${base}-{light,dark}.svg (${light.length}/${dark.length} bytes)`);
}
