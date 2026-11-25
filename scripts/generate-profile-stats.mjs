#!/usr/bin/env node
/**
 * generate-profile-stats.mjs
 *
 * Self-contained GitHub profile stats generator (zero dependencies).
 * Fetches live data via GitHub APIs and renders a family of SVG widgets:
 *   - contribution-graph-{light,dark}.svg   (12-month heatmap)
 *   - top-languages-{light,dark}.svg        (top languages by repo size)
 *   - streak-stats-{light,dark}.svg         (current/longest streak + sparkline)
 *
 * Designed for a nightly GitHub Action (see .github/workflows/nightly-profile-stats.yml).
 *
 * Usage:
 *   GH_LOGIN=souravfrank GH_TOKEN=<token> node scripts/generate-profile-stats.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const OUT_DIR = join(REPO_ROOT, 'assets', 'stats');

const LOGIN = process.env.GH_LOGIN || 'souravfrank';
const TOKEN = process.env.GH_TOKEN || '';
const GQL_API = 'https://api.github.com/graphql';
const REST_API = 'https://api.github.com';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function graphql(query, variables) {
  if (!TOKEN) throw new Error('GH_TOKEN is required to query the GitHub GraphQL API.');
  const res = await fetch(GQL_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'profile-stats-generator',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.errors) throw new Error('GraphQL errors: ' + JSON.stringify(body.errors));
  return body.data;
}

async function restJson(url) {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'user-agent': 'profile-stats-generator',
      accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`REST HTTP ${res.status} for ${url}`);
  return res.json();
}

const CALENDAR_QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays { date contributionCount }
          }
        }
      }
    }
  }
`;

async function fetchCalendar(from, to) {
  const data = await graphql(CALENDAR_QUERY, { login: LOGIN, from, to });
  return data.user.contributionsCollection.contributionCalendar.weeks;
}

async function fetchRepos() {
  const repos = [];
  let page = 1;
  for (;;) {
    const batch = await restJson(`${REST_API}/users/${LOGIN}/repos?per_page=100&sort=updated&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos;
}

/** Commits by this user across their own non-fork public repos (contributors endpoint). */
async function fetchOwnCommits(repos) {
  let total = 0;
  for (const repo of repos) {
    if (repo.fork) continue;
    try {
      const contributors = await restJson(
        `${REST_API}/repos/${repo.full_name}/contributors?anon=true&per_page=100`,
      );
      const me = contributors.find((c) => c.login && c.login.toLowerCase() === LOGIN.toLowerCase());
      if (me) total += me.contributions;
    } catch {
      // private/empty repos may not expose contributors — count as 0
    }
  }
  return total;
}

/** Total count of PRs / issues authored by this user (search API). */
async function searchCount(type) {
  const q = encodeURIComponent(`author:${LOGIN} type:${type}`);
  const data = await restJson(`${REST_API}/search/issues?q=${q}&per_page=1`);
  return data.total_count || 0;
}

async function computeAccountStats(repos) {
  const stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const topRepos = repos
    .filter((r) => !r.fork)
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 3)
    .map((r) => ({ name: r.name, stars: r.stargazers_count || 0 }));
  const [commitsOwn, prs, issues] = await Promise.all([
    fetchOwnCommits(repos),
    searchCount('pr'),
    searchCount('issue'),
  ]);
  return { stars, commitsOwn, prs, issues, topRepos };
}

// ---------------------------------------------------------------------------
// Data analysis
// ---------------------------------------------------------------------------

function dayKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function summarizeCalendar(weeks) {
  const counts = new Map();
  for (const week of weeks) {
    for (const day of week.contributionDays) counts.set(day.date, day.contributionCount);
  }
  const days = [...counts.keys()].sort();
  const total = days.reduce((s, d) => s + counts.get(d), 0);

  const todayKey = dayKey(new Date());
  const seq = days.filter((d) => d <= todayKey);

  let currentStreak = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (counts.get(seq[i]) > 0) currentStreak++;
    else break;
  }
  let longestStreak = 0;
  let run = 0;
  for (const d of seq) {
    if (counts.get(d) > 0) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else run = 0;
  }

  // last 30 days (incl. today)
  let last30 = 0;
  const last30From = dayKey(new Date(Date.now() - 29 * 86400000));
  const last30Days = [];
  for (const d of seq) {
    if (d >= last30From) {
      last30 += counts.get(d);
      last30Days.push(counts.get(d));
    }
  }

  return { counts, total, currentStreak, longestStreak, last30, last30Days };
}

function languageBreakdown(repos) {
  const byLang = new Map();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    byLang.set(repo.language, (byLang.get(repo.language) || 0) + (repo.size || 0));
  }
  const sorted = [...byLang.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6).map(([name, kb]) => ({ name, kb }));
  const restKb = sorted.slice(6).reduce((s, [, kb]) => s + kb, 0);
  if (restKb > 0) top.push({ name: 'Other', kb: restKb });
  const totalKb = top.reduce((s, l) => s + l.kb, 0);
  return top.map((l) => ({ ...l, pct: totalKb ? Math.round((l.kb / totalKb) * 100) : 0 }));
}

// ---------------------------------------------------------------------------
// SVG chrome & palettes
// ---------------------------------------------------------------------------

const PALETTES = {
  light: {
    bg: '#ffffff',
    card: '#f6f8fa',
    border: 'rgba(27,31,36,0.10)',
    text: '#24292f',
    subtext: '#57606a',
    faint: '#8b949e',
    accentFrom: '#0e0ba2',
    accentTo: '#3b3bd6',
    accentGlow: '#61DAFB',
    track: 'rgba(9,30,66,0.08)',
    grid: '#ebedf0',
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    flame: '#e36209',
    font: "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif",
  },
  dark: {
    bg: '#0d1117',
    card: '#161b22',
    border: 'rgba(240,246,252,0.10)',
    text: '#c9d1d9',
    subtext: '#8b949e',
    faint: '#484f58',
    accentFrom: '#61DAFB',
    accentTo: '#3b3bd6',
    accentGlow: '#61DAFB',
    track: 'rgba(240,246,252,0.06)',
    grid: '#161b22',
    levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    flame: '#ff7b72',
    font: "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif",
  },
};

const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#663399',
  Python: '#3572a5',
  Java: '#b07219',
  Swift: '#f05138',
  'Objective-C': '#438eff',
  Shell: '#89e051',
  'C++': '#f34b7d',
  Rust: '#dea584',
  Go: '#00add8',
  Kotlin: '#a97bff',
  Ruby: '#701516',
  Dart: '#00b4ab',
  Vue: '#41b883',
  Other: '#8b949e',
};

function langColor(name) {
  return LANG_COLORS[name] || '#8b949e';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cardFrame(w, h, p, title, subtitle, extraDefs = '') {
  const gid = `grad-${Math.random().toString(36).slice(2, 8)}`;
  return {
    gid,
    top: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <defs>
    <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.accentFrom}"/>
      <stop offset="100%" stop-color="${p.accentTo}"/>
    </linearGradient>
    ${extraDefs}
  </defs>
  <rect width="${w}" height="${h}" rx="14" fill="${p.card}" stroke="${p.border}" stroke-width="1"/>
  <text x="24" y="36" font-family="${p.font}" font-size="16" font-weight="650" fill="${p.text}">${esc(title)}</text>
  <text x="24" y="53" font-family="${p.font}" font-size="11" fill="${p.subtext}">${esc(subtitle)}</text>`,
    bottom: `</svg>\n`,
  };
}

// ---------------------------------------------------------------------------
// Widget: contribution heatmap
// ---------------------------------------------------------------------------

function level(count) {
  if (count === 0) return 0;
  if (count < 4) return 1;
  if (count < 7) return 2;
  if (count < 10) return 3;
  return 4;
}

function renderGraph(weeks, stats, p) {
  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;
  const COL_W = 34;
  const TOP = 78;
  const W = weeks.length;
  const width = COL_W + W * STEP + 12;
  const height = TOP + 7 * STEP + 34;

  const monthLabels = [];
  let prevMonth = -1;
  weeks.forEach((week, wi) => {
    const first = parseDate(week.contributionDays[0].date);
    if (first.getUTCMonth() !== prevMonth) {
      prevMonth = first.getUTCMonth();
      monthLabels.push({ x: COL_W + wi * STEP + 2, label: MONTHS[prevMonth] });
    }
  });

  let cells = '';
  weeks.forEach((week, wi) => {
    week.contributionDays.forEach((day, di) => {
      const x = COL_W + wi * STEP;
      const y = TOP + di * STEP;
      const fill = level(day.contributionCount) === 0 ? p.grid : p.levels[level(day.contributionCount)];
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}">` +
        `<title>${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}</title></rect>`;
    });
  });

  let rows = '';
  [0, 3, 5].forEach((di) => {
    rows += `<text x="${COL_W - 8}" y="${TOP + di * STEP + 9}" text-anchor="end" font-family="${p.font}" font-size="9" fill="${p.subtext}">${WEEKDAYS[di]}</text>`;
  });

  let labels = '';
  for (const m of monthLabels) {
    labels += `<text x="${m.x}" y="${TOP - 8}" font-family="${p.font}" font-size="10" fill="${p.subtext}">${m.label}</text>`;
  }

  // legend
  const legendX = width - 150;
  let legend = '<text x="' + legendX + '" y="' + (height - 14) + '" font-family="' + p.font + '" font-size="10" fill="' + p.subtext + '">Less</text>';
  p.levels.forEach((c, i) => {
    legend += `<rect x="${legendX + 34 + i * 16}" y="${height - 20}" width="11" height="11" rx="2.5" fill="${c}"/>`;
  });
  legend += '<text x="' + (legendX + 34 + 4 * 16 + 2) + '" y="' + (height - 14) + '" font-family="' + p.font + '" font-size="10" fill="' + p.subtext + '">More</text>';

  const sub = `last 12 months · ${stats.total.toLocaleString('en-US')} contributions`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contributions heatmap for the last 12 months (${stats.total.toLocaleString('en-US')} total)">
  <rect width="${width}" height="${height}" rx="14" fill="${p.card}" stroke="${p.border}" stroke-width="1"/>
  <text x="24" y="34" font-family="${p.font}" font-size="16" font-weight="650" fill="${p.text}">Contributions</text>
  <text x="24" y="52" font-family="${p.font}" font-size="11" fill="${p.subtext}">${esc(sub)}</text>
  ${labels}
  ${rows}
  ${cells}
  ${legend}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Widget: top languages
// ---------------------------------------------------------------------------

function renderLanguages(langs, p) {
  const W = 560;
  const H = 330;
  const f = cardFrame(W, H, p, 'Top Languages', 'by repository size · largest first', '');

  let rows = '';
  const barX = 140;
  const barW = 310;
  const pctX = 466;
  const maxKb = Math.max(...langs.map((l) => l.kb), 1);
  langs.slice(0, 7).forEach((l, i) => {
    const y = 84 + i * 34;
    const bw = Math.max(8, Math.round((l.kb / maxKb) * barW));
    rows += `
    <circle cx="31" cy="${y + 5}" r="5" fill="${langColor(l.name)}"/>
    <text x="44" y="${y + 9}" font-family="${p.font}" font-size="12" font-weight="600" fill="${p.text}">${esc(l.name)}</text>
    <rect x="${barX}" y="${y}" width="${barW}" height="10" rx="5" fill="${p.track}"/>
    <rect x="${barX}" y="${y}" width="${bw}" height="10" rx="5" fill="url(#${f.gid})"/>
    <text x="${pctX}" y="${y + 9}" font-family="${p.font}" font-size="12" font-weight="600" fill="${p.subtext}">${l.pct}%</text>`;
  });

  const totalLabel = `${langs.reduce((s, l) => s + l.kb, 0).toLocaleString('en-US')} KB analyzed`;
  const footer = `<text x="${W - 24}" y="${H - 16}" text-anchor="end" font-family="${p.font}" font-size="10" fill="${p.faint}">${totalLabel}</text>`;

  return `${f.top}${rows}${footer}${f.bottom}`;
}

// ---------------------------------------------------------------------------
// Widget: streak stats
// ---------------------------------------------------------------------------

function renderStreak(stats, p) {
  const W = 560;
  const H = 330;
  const f = cardFrame(W, H, p, 'Streak', 'consistency over the last 12 months', '');

  // ring
  const cx = 110;
  const cy = 172;
  const R = 46;
  const C = 2 * Math.PI * R;
  const frac = stats.longestStreak > 0 ? Math.min(1, stats.currentStreak / stats.longestStreak) : 0;
  const dash = Math.max(1, frac * C);
  const ring = `
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.track}" stroke-width="9"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#${f.gid})" stroke-width="9"
            stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${C.toFixed(1)}"
            transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-family="${p.font}" font-size="38" font-weight="700" fill="url(#${f.gid})">${stats.currentStreak}</text>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="${p.font}" font-size="11" fill="${p.subtext}">day streak</text>`;

  // stat rows
  const statRows = [
    ['Longest streak', `${stats.longestStreak} days`],
  ];
  const sx = 200;
  let rows = '';
  statRows.forEach(([label, value], i) => {
    const y = 128 + i * 44;
    rows += `
    <text x="${sx}" y="${y}" font-family="${p.font}" font-size="12" fill="${p.subtext}">${label}</text>
    <text x="${sx}" y="${y + 20}" font-family="${p.font}" font-size="18" font-weight="650" fill="${p.text}">${value}</text>`;
  });

  // 30-day sparkline
  const sparkY = 262;
  const sparkX0 = 200;
  const sparkW = W - sparkX0 - 24;
  const max30 = Math.max(...stats.last30Days, 1);
  const n = stats.last30Days.length;
  const bw = Math.max(2, Math.floor((sparkW - (n - 1) * 2) / n));
  let spark = '';
  stats.last30Days.forEach((c, i) => {
    const bh = Math.max(2, Math.round((c / max30) * 44));
    spark += `<rect x="${sparkX0 + i * (bw + 2)}" y="${sparkY + 44 - bh}" width="${bw}" height="${bh}" rx="1.5" fill="${c > 0 ? 'url(#' + f.gid + ')' : p.grid}"/>`;
  });
  spark += `<text x="${sparkX0}" y="${sparkY + 58}" font-family="${p.font}" font-size="9" fill="${p.faint}">last 30 days</text>`;

  return `${f.top}${ring}${rows}${spark}${f.bottom}`;
}

// ---------------------------------------------------------------------------
// Widget: GitHub stats
// ---------------------------------------------------------------------------

function fmtCompact(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function renderStats(account, p) {
  const W = 560;
  const H = 330;
  const f = cardFrame(W, H, p, 'GitHub Stats', 'across public repositories', '');

  const tiles = [
    { label: 'Stars earned', value: fmtCompact(account.stars) },
    { label: 'Commits · own repos', value: fmtCompact(account.commitsOwn) },
    { label: 'Pull requests', value: fmtCompact(account.prs) },
    { label: 'Issues opened', value: fmtCompact(account.issues) },
  ];
  const tileX = [24, 292];
  const tileY = [84, 148];
  let grid = '';
  tiles.forEach((t, i) => {
    const x = tileX[i % 2];
    const y = tileY[Math.floor(i / 2)];
    grid += `
    <text x="${x}" y="${y + 26}" font-family="${p.font}" font-size="26" font-weight="700" fill="url(#${f.gid})">${t.value}</text>
    <text x="${x}" y="${y + 44}" font-family="${p.font}" font-size="11" fill="${p.subtext}">${esc(t.label)}</text>`;
  });

  let reposRows = '';
  if (account.topRepos.length > 0) {
    account.topRepos.forEach((r, i) => {
      const y = 226 + i * 32;
      reposRows += `
    <text x="24" y="${y}" font-family="${p.font}" font-size="10" fill="${p.faint}">${String(i + 1).padStart(2, '0')}</text>
    <text x="48" y="${y}" font-family="${p.font}" font-size="12" font-weight="600" fill="${p.text}">${esc(truncate(r.name, 34))}</text>
    <text x="${W - 24}" y="${y}" text-anchor="end" font-family="${p.font}" font-size="12" fill="${p.subtext}">★ ${fmtCompact(r.stars)}</text>`;
    });
  } else {
    reposRows = `<text x="24" y="240" font-family="${p.font}" font-size="12" fill="${p.subtext}">No starred public repos yet</text>`;
  }

  const sectionLabel = `<text x="24" y="212" font-family="${p.font}" font-size="11" font-weight="600" fill="${p.subtext}">Top public repos</text>`;

  return `${f.top}${grid}${sectionLabel}${reposRows}${f.bottom}`;
}

// ---------------------------------------------------------------------------
// Widget: grand telemetry dashboard (single futuristic SVG)
// ---------------------------------------------------------------------------

const FUT_PALETTES = {
  light: {
    bg0: '#eef2ff',
    bg1: '#dfe7fb',
    hairline: 'rgba(20,30,80,0.06)',
    panel: 'rgba(255,255,255,0.72)',
    panelStroke: 'rgba(59,59,214,0.22)',
    text: '#131a33',
    subtext: '#5b6794',
    faint: '#8792b8',
    accentFrom: '#3b3bd6',
    accentTo: '#61DAFB',
    glowColor: 'rgba(97,218,251,0.55)',
    track: 'rgba(20,30,80,0.08)',
    barTrack: 'rgba(20,30,80,0.10)',
    heat: ['#e8edfb', '#c0d3ff', '#7ea3ff', '#3d6fff', '#6929ff'],
    font: "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif",
  },
  dark: {
    bg0: '#070b16',
    bg1: '#0d1428',
    hairline: 'rgba(120,160,255,0.05)',
    panel: 'rgba(13,20,40,0.66)',
    panelStroke: 'rgba(97,218,251,0.28)',
    text: '#e6f1ff',
    subtext: '#8aa0cc',
    faint: '#55648a',
    accentFrom: '#61DAFB',
    accentTo: '#8b5cf6',
    glowColor: 'rgba(56,189,248,0.50)',
    track: 'rgba(200,220,255,0.06)',
    barTrack: 'rgba(200,220,255,0.08)',
    heat: ['#0b1428', '#12355c', '#0f63a8', '#1496e8', '#37d8ff'],
    font: "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif",
  },
};

function bracketPaths(x, y, w, h, len = 10) {
  return `M${x} ${y} l0 ${-len} l${len} 0 M${x + w} ${y} l0 ${-len} l${-len} 0 M${x} ${y + h} l0 ${len} l${len} 0 M${x + w} ${y + h} l0 ${len} l${-len} 0`;
}

function glowText({ x, y, size, weight, anchor = 'middle', text, core, glow, font }) {
  const sh = (dx) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${glow}" opacity="0.45" transform="translate(${dx} 0)">${text}</text>`;
  return `<g>${sh(-1.1)}${sh(1.1)}${sh(0)}<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${core}">${text}</text></g>`;
}

function renderTelemetry(data, p) {
  const W = 1060;
  const H = 680;
  const { weeks, stats, accountStats, langs, year } = data;
  const gid = 'tgrad';
  const parts = [];

  // background
  parts.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);

  // hairline grid
  for (let x = 28; x <= 1032; x += 80) {
    parts.push(`<line x1="${x}" y1="100" x2="${x}" y2="${H - 24}" stroke="${p.hairline}" stroke-width="1"/>`);
  }
  for (let y = 100; y <= 656; y += 60) {
    parts.push(`<line x1="28" y1="${y}" x2="1032" y2="${y}" stroke="${p.hairline}" stroke-width="1"/>`);
  }

  // header
  parts.push(`<text x="28" y="52" font-family="${p.font}" font-size="24" font-weight="800" letter-spacing="6" fill="${p.text}">TELEMETRY</text>`);
  parts.push(`<text x="28" y="74" font-family="${p.font}" font-size="11" fill="${p.subtext}">${year} · live data · updated nightly</text>`);
  parts.push(glowText({ x: 990, y: 52, size: 30, weight: 800, anchor: 'end', text: stats.total.toLocaleString('en-US'), core: p.text, glow: p.glowColor, font: p.font }));
  parts.push(`<text x="990" y="74" text-anchor="end" font-family="${p.font}" font-size="10" letter-spacing="1.2" fill="${p.subtext}">CONTRIBUTIONS · LAST 12 MONTHS</text>`);
  parts.push(`<circle cx="1000" cy="94" r="3.5" fill="${p.accentTo}"/><circle cx="1000" cy="94" r="7" fill="none" stroke="${p.accentTo}" stroke-width="1" opacity="0.5"/>`);
  parts.push(`<line x1="28" y1="100" x2="1032" y2="100" stroke="url(#${gid})" stroke-width="2" opacity="0.8"/>`);

  // heatmap
  const CELL = 10;
  const GAP = 2;
  const STEP = CELL + GAP;
  const X0 = 64;
  const Y0 = 128;
  let cells = '';
  weeks.forEach((week, wi) => {
    week.contributionDays.forEach((day, di) => {
      const lvl = level(day.contributionCount);
      const fill = lvl === 0 ? p.track : p.heat[lvl];
      cells += `<rect x="${X0 + wi * STEP}" y="${Y0 + di * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"><title>${day.date}: ${day.contributionCount}</title></rect>`;
    });
  });
  let prevMonth = -1;
  let months = '';
  weeks.forEach((week, wi) => {
    const d = parseDate(week.contributionDays[0].date);
    if (d.getUTCMonth() !== prevMonth) {
      prevMonth = d.getUTCMonth();
      months += `<text x="${X0 + wi * STEP + 1}" y="${Y0 - 8}" font-family="${p.font}" font-size="9" fill="${p.faint}">${MONTHS[prevMonth]}</text>`;
    }
  });
  let wd = '';
  [0, 3, 5].forEach((di) => {
    wd += `<text x="${X0 - 8}" y="${Y0 + di * STEP + 8}" text-anchor="end" font-family="${p.font}" font-size="9" fill="${p.faint}">${WEEKDAYS[di]}</text>`;
  });
  parts.push(months, wd, cells);
  parts.push(`<text x="${X0}" y="${Y0 + 7 * STEP + 18}" font-family="${p.font}" font-size="9" fill="${p.faint}">ACTIVITY GRID · HOVER FOR DAILY COUNTS</text>`);

  // panels
  const RX = 756;
  const RW = 276;
  const panel = (px, py, pw, ph, label) =>
    `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="14" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>` +
    `<path d="${bracketPaths(px, py, pw, ph)}" fill="none" stroke="${p.accentTo}" stroke-width="1.5" opacity="0.7"/>` +
    `<text x="${px + 20}" y="${py + 24}" font-family="${p.font}" font-size="10" font-weight="700" letter-spacing="2" fill="${p.subtext}">${label}</text>`;

  // streak
  const spy = 110;
  const sph = 132;
  parts.push(panel(RX, spy, RW, sph, 'STREAK'));
  const rc = { x: RX + 42, y: spy + 64, r: 30 };
  const C = 2 * Math.PI * (rc.r - 3);
  const frac = stats.longestStreak > 0 ? Math.min(1, stats.currentStreak / stats.longestStreak) : 0;
  parts.push(
    `<circle cx="${rc.x}" cy="${rc.y}" r="${rc.r - 3}" fill="none" stroke="${p.track}" stroke-width="7"/>`,
    `<circle cx="${rc.x}" cy="${rc.y}" r="${rc.r - 3}" fill="none" stroke="url(#${gid})" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(frac * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${rc.x} ${rc.y})"/>`,
    glowText({ x: rc.x, y: rc.y + 8, size: 26, weight: 800, anchor: 'middle', text: String(stats.currentStreak), core: p.text, glow: p.glowColor, font: p.font }),
    `<text x="${rc.x}" y="${rc.y + 26}" text-anchor="middle" font-family="${p.font}" font-size="8" letter-spacing="1.5" fill="${p.faint}">CURRENT · DAYS</text>`,
  );
  const sepX = RX + 96;
  parts.push(`<line x1="${sepX}" y1="${spy + 30}" x2="${sepX}" y2="${spy + sph - 18}" stroke="${p.panelStroke}" stroke-width="1"/>`);
  parts.push(
    `<text x="${sepX + 24}" y="${spy + 58}" font-family="${p.font}" font-size="9" letter-spacing="1.5" fill="${p.faint}">LONGEST</text>`,
    glowText({ x: sepX + 24, y: spy + 88, size: 30, weight: 800, anchor: 'start', text: `${stats.longestStreak}d`, core: p.text, glow: p.glowColor, font: p.font }),
    `<text x="${sepX + 24}" y="${spy + 108}" font-family="${p.font}" font-size="9" fill="${p.faint}">STREAK · DAYS</text>`,
  );
  const spX = RX + 14;
  const spY = spy + sph - 34;
  const spW = RW - 28;
  const max30 = Math.max(...stats.last30Days, 1);
  const n = stats.last30Days.length;
  const bw = Math.max(2, Math.floor((spW - (n - 1) * 2) / n));
  let spark = '';
  stats.last30Days.forEach((cv, i) => {
    const bh = Math.max(2, Math.round((cv / max30) * 18));
    spark += `<rect x="${spX + i * (bw + 2)}" y="${spY + 18 - bh}" width="${bw}" height="${bh}" rx="1.5" fill="${cv > 0 ? 'url(#' + gid + ')' : p.track}"/>`;
  });
  parts.push(spark, `<text x="${spX + spW}" y="${spY + 32}" text-anchor="end" font-family="${p.font}" font-size="8" fill="${p.faint}">LAST 30D</text>`);

  // metrics
  const mpy = 254;
  const mph = 150;
  parts.push(panel(RX, mpy, RW, mph, 'METRICS'));
  const tiles = [
    ['STARS', fmtCompact(accountStats.stars)],
    ['COMMITS', fmtCompact(accountStats.commitsOwn)],
    ['PULL REQS', fmtCompact(accountStats.prs)],
    ['ISSUES', fmtCompact(accountStats.issues)],
  ];
  const colX = [RX + 20, RX + 150];
  const rowY = [mpy + 52, mpy + 102];
  tiles.forEach((t, i) => {
    const x = colX[i % 2];
    const y = rowY[Math.floor(i / 2)];
    parts.push(
      `<rect x="${x}" y="${y - 20}" width="4" height="24" rx="2" fill="url(#${gid})"/>`,
      glowText({ x: x + 14, y, size: 22, weight: 800, anchor: 'start', text: t[1], core: p.text, glow: p.glowColor, font: p.font }),
      `<text x="${x + 14}" y="${y + 20}" font-family="${p.font}" font-size="8.5" letter-spacing="1.2" fill="${p.subtext}">${t[0]}</text>`,
    );
  });

  // languages
  const lpy = 416;
  const lph = 180;
  parts.push(panel(RX, lpy, RW, lph, 'LANGUAGES'));
  const maxKb = Math.max(...langs.map((l) => l.kb), 1);
  langs.slice(0, 4).forEach((l, i) => {
    const y = lpy + 54 + i * 32;
    const bwL = Math.max(6, Math.round((l.kb / maxKb) * 110));
    parts.push(
      `<circle cx="${RX + 24}" cy="${y - 3}" r="4" fill="${langColor(l.name)}"/>`,
      `<text x="${RX + 38}" y="${y}" font-family="${p.font}" font-size="11" font-weight="600" fill="${p.text}">${esc(l.name)}</text>`,
      `<rect x="${RX + 118}" y="${y - 6}" width="110" height="6" rx="3" fill="${p.barTrack}"/>`,
      `<rect x="${RX + 118}" y="${y - 6}" width="${bwL}" height="6" rx="3" fill="url(#${gid})"/>`,
      `<text x="${RX + 248}" y="${y}" text-anchor="end" font-family="${p.font}" font-size="11" font-weight="700" fill="${p.subtext}">${l.pct}%</text>`,
    );
  });

  // footer: top repos
  const fy = 612;
  parts.push(
    `<rect x="28" y="${fy}" width="1004" height="52" rx="14" fill="${p.panel}" stroke="${p.panelStroke}" stroke-width="1"/>`,
    `<text x="44" y="${fy + 24}" font-family="${p.font}" font-size="9" font-weight="700" letter-spacing="2" fill="${p.subtext}">TOP PUBLIC REPOS</text>`,
  );
  accountStats.topRepos.forEach((r, i) => {
    parts.push(`<text x="${44 + (i % 3) * 300}" y="${fy + 42}" font-family="${p.font}" font-size="12" font-weight="600" fill="${p.text}">${esc(truncate(r.name, 26))} <tspan fill="${p.accentTo}">★ ${fmtCompact(r.stars)}</tspan></text>`);
  });

  const body = parts.join('\n  ');
  const langSummary = langs.map((l) => `${l.name} ${l.pct}%`).join(', ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Telemetry: ${stats.total.toLocaleString('en-US')} contributions in the last 12 months, current streak ${stats.currentStreak} days, longest streak ${stats.longestStreak} days. Languages: ${esc(langSummary)}. Stars ${fmtCompact(accountStats.stars)}, commits ${fmtCompact(accountStats.commitsOwn)}, pull requests ${fmtCompact(accountStats.prs)}, issues ${fmtCompact(accountStats.issues)}.">
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 364));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  const weeks = await fetchCalendar(from.toISOString(), to.toISOString());
  const stats = summarizeCalendar(weeks);

  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearWeeks = await fetchCalendar(yearStart.toISOString(), to.toISOString());
  stats.yearTotal = yearWeeks.reduce(
    (s, w) => s + w.contributionDays.reduce((a, d) => a + d.contributionCount, 0),
    0,
  );

  const repos = await fetchRepos();
  const langs = languageBreakdown(repos);
  const accountStats = await computeAccountStats(repos);

  mkdirSync(OUT_DIR, { recursive: true });
  const teleData = { weeks, stats, accountStats, langs, year: now.getUTCFullYear() };
  const outputs = [
    ['telemetry', renderTelemetry(teleData, FUT_PALETTES.light), renderTelemetry(teleData, FUT_PALETTES.dark)],
  ];

  for (const [base, light, dark] of outputs) {
    writeFileSync(join(OUT_DIR, `${base}-light.svg`), light, 'utf8');
    writeFileSync(join(OUT_DIR, `${base}-dark.svg`), dark, 'utf8');
    console.log(`wrote ${base}-{light,dark}.svg (${light.length}/${dark.length} bytes)`);
  }

  console.log(JSON.stringify({
    total: stats.total,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    yearTotal: stats.yearTotal,
    last30: stats.last30,
    languages: langs.map((l) => `${l.name} ${l.pct}%`),
    stars: accountStats.stars,
    commitsOwn: accountStats.commitsOwn,
    prs: accountStats.prs,
    issues: accountStats.issues,
    topRepos: accountStats.topRepos,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
