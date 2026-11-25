#!/usr/bin/env node
/**
 * generate-profile-stats.mjs
 *
 * Self-contained GitHub contribution stats generator.
 * - Uses only Node built-ins (fs, global fetch) — zero dependencies.
 * - Fetches contribution data via GitHub GraphQL.
 * - Renders two SVG heatmaps (light + dark) into assets/stats/.
 * - Designed to run in a GitHub Action nightly (see .github/workflows/nightly-profile-stats.yml).
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
const API = 'https://api.github.com/graphql';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

async function graphql(query, variables) {
  if (!TOKEN) throw new Error('GH_TOKEN is required to query the GitHub GraphQL API.');
  const res = await fetch(API, {
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

// ---------------------------------------------------------------------------
// Data analysis
// ---------------------------------------------------------------------------

function isoDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** counts: Map 'YYYY-MM-DD' -> number */
function summarize(weeks) {
  const counts = new Map();
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      counts.set(day.date, day.contributionCount);
    }
  }
  const days = [...counts.keys()].sort();
  const total = days.reduce((s, d) => s + counts.get(d), 0);

  // streak over the window, ending at the latest non-zero day on/before today
  const todayKey = dayKey(new Date());
  const seq = days.filter((d) => d <= todayKey);
  let currentStreak = 0;
  let longestStreak = 0;
  let run = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (counts.get(seq[i]) > 0) currentStreak++;
    else break;
  }
  for (const d of seq) {
    if (counts.get(d) > 0) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }
  return { counts, total, currentStreak, longestStreak };
}

// ---------------------------------------------------------------------------
// SVG rendering
// ---------------------------------------------------------------------------

/** GitHub-style level buckets for a contribution count */
function level(count) {
  if (count === 0) return 0;
  if (count < 4) return 1;
  if (count < 7) return 2;
  if (count < 10) return 3;
  return 4;
}

function renderGraph(weeks, { total, currentStreak, longestStreak, yearTotal, year }, palette) {
  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;
  const COL_W = 34; // left gutter for weekday labels
  const TOP = 64; // header area
  const N_ROWS = 7;

  const W = weeks.length;
  const width = COL_W + W * STEP + 12;
  const height = TOP + N_ROWS * STEP + 12;

  // month label positions: at the first week whose first day changes month
  const monthLabels = [];
  let prevMonth = -1;
  weeks.forEach((week, wi) => {
    const first = parseDate(week.contributionDays[0].date);
    if (first.getUTCMonth() !== prevMonth) {
      prevMonth = first.getUTCMonth();
      monthLabels.push({ x: COL_W + wi * STEP + 2, label: MONTHS[prevMonth] });
    }
  });

  const rows = [];
  let cells = '';
  weeks.forEach((week, wi) => {
    week.contributionDays.forEach((day, di) => {
      const x = COL_W + wi * STEP;
      const y = TOP + di * STEP;
      const lvl = level(day.contributionCount);
      const fill = lvl === 0 ? palette.grid : palette.levels[lvl];
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}">` +
        `<title>${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}</title></rect>`;
    });
  });

  // weekday labels on the rows we care about (Sun, Wed, Fri)
  [0, 3, 5].forEach((di) => {
    rows.push(`<text x="${COL_W - 8}" y="${TOP + di * STEP + 9}" text-anchor="end" font-family="${palette.font}" font-size="9" fill="${palette.subtext}">${WEEKDAYS[di]}</text>`);
  });

  // header
  const header = `
    <text x="12" y="26" font-family="${palette.font}" font-size="16" font-weight="600" fill="${palette.text}">${total.toLocaleString('en-US')} contributions in the last 12 months</text>
    <text x="12" y="44" font-family="${palette.font}" font-size="12" fill="${palette.subtext}">Current streak <tspan font-weight="600" fill="${palette.text}">${currentStreak} days</tspan> · Longest streak <tspan font-weight="600" fill="${palette.text}">${longestStreak} days</tspan> · ${yearTotal.toLocaleString('en-US')} contributions in ${year}</text>`;

  const labels = monthLabels.map((m) => `<text x="${m.x}" y="${TOP - 8}" font-family="${palette.font}" font-size="10" fill="${palette.subtext}">${m.label}</text>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${total.toLocaleString('en-US')} contributions in the last 12 months, current streak ${currentStreak} days, longest streak ${longestStreak} days">
  <rect width="${width}" height="${height}" rx="8" fill="${palette.bg}"/>
  ${header}
  ${labels}
  ${rows.join('\n  ')}
  ${cells}
</svg>
`;
}

const PALETTES = {
  light: {
    bg: '#ffffff',
    text: '#24292f',
    subtext: '#57606a',
    grid: '#ebedf0',
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    font: "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif",
  },
  dark: {
    bg: '#0d1117',
    text: '#c9d1d9',
    subtext: '#8b949e',
    grid: '#161b22',
    levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    font: "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif",
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();
  // window: 364 days back through today (365 days incl. today)
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 364));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  const weeks = await fetchCalendar(from.toISOString(), to.toISOString());

  // this-year total
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearWeeks = await fetchCalendar(yearStart.toISOString(), to.toISOString());
  const yearTotal = yearWeeks.reduce(
    (s, w) => s + w.contributionDays.reduce((a, d) => a + d.contributionCount, 0),
    0,
  );

  const { total, currentStreak, longestStreak } = summarize(weeks);
  const year = now.getUTCFullYear();

  mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, palette] of Object.entries(PALETTES)) {
    const svg = renderGraph(weeks, { total, currentStreak, longestStreak, yearTotal, year }, palette);
    const file = join(OUT_DIR, `contribution-graph-${name}.svg`);
    writeFileSync(file, svg, 'utf8');
    console.log(`wrote ${file} (${svg.length} bytes)`);
  }

  console.log(JSON.stringify({ total, currentStreak, longestStreak, yearTotal, year }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
