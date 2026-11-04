#!/usr/bin/env node
/**
 * Stage 1 gate: the local surfaces must be boringly reliable.
 *
 * The gate from the roadmap, made executable:
 *
 *   "The CLI and local MCP run ten real sites in a row with no crash, no
 *    timeout, and no finding that changes between two runs."
 *
 * That last clause is the one that matters. A score that drifts between runs is
 * worse than a score that is wrong, because it cannot be trusted or debugged.
 * Every site is therefore scanned TWICE and the finding sets are compared.
 *
 * Usage:
 *   npx tsx scripts/battery.mjs                  # the default ten
 *   npx tsx scripts/battery.mjs --runs 3         # three passes per site
 *   npx tsx scripts/battery.mjs https://a.com …  # your own list
 *
 * Exit: 0 all sites stable, 1 something drifted or failed, 2 usage error.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanPage, closeBrowser, ScanError } from '../src/lib/scan.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** A spread of real pages: tiny, huge, animated, JS-heavy, government, docs. */
const DEFAULT_SITES = [
  { url: 'https://example.com', note: 'minimal, no JS' },
  { url: 'https://soporteml.com', note: 'React SPA, animations, was 49 F' },
  { url: 'https://stripe.com', note: 'large corporate, heavy animation' },
  { url: 'https://developer.mozilla.org', note: 'documentation, dense markup' },
  { url: 'https://www.gov.uk', note: 'public sector, a11y-mature' },
  { url: 'https://vercel.com', note: 'marketing, framework-built' },
  { url: 'https://www.w3.org/WAI/', note: 'accessibility reference site' },
  { url: 'https://github.com', note: 'huge DOM, authenticated shell' },
  { url: 'https://tailwindcss.com', note: 'docs, dark mode' },
  { url: 'https://nextjs.org', note: 'docs, Next.js' },
];

function signature(result) {
  // The stable identity of a scan: rule ids plus their node counts, sorted.
  // Two runs must agree on this, or the measurement is not deterministic.
  return result.findings
    .map((f) => `${f.id}:${f.nodes.length}`)
    .sort()
    .join('|');
}

function fmt(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

async function main() {
  const args = process.argv.slice(2);
  const runsIndex = args.indexOf('--runs');
  const runCount = runsIndex !== -1 ? Math.max(2, Number(args[runsIndex + 1] ?? 2)) : 2;
  const custom = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  const sites = custom.length
    ? custom.map((url) => ({ url, note: 'custom' }))
    : DEFAULT_SITES;

  console.log(`\n  Stage 1 gate — ${sites.length} sites × ${runCount} runs\n`);

  const results = [];
  for (const site of sites) {
    const runs = [];
    let error = null;

    for (let run = 1; run <= runCount; run += 1) {
      try {
        const r = await scanPage(site.url);
        runs.push({
          score: r.score.value,
          grade: r.score.grade,
          blocking: r.score.blocking,
          signature: signature(r),
          findings: r.findings.length,
          durationMs: r.durationMs,
        });
      } catch (err) {
        error = err instanceof ScanError ? err.message : String(err);
        break;
      }
    }

    const signatures = new Set(runs.map((r) => r.signature));
    const scores = new Set(runs.map((r) => r.score));
    const stable = !error && signatures.size === 1 && scores.size === 1;

    results.push({
      url: site.url,
      note: site.note,
      stable,
      error,
      runs,
      drift: stable ? null : { signatures: [...signatures], scores: [...scores] },
    });

    const first = runs[0];
    const tag = error ? 'ERROR' : stable ? 'stable' : 'DRIFT';
    const detail = error
      ? error.slice(0, 60)
      : first
        ? `${String(first.score).padStart(3)}/${first.grade} · ${first.findings} findings · ${first.runs ?? ''}${fmt(first.durationMs)}`
        : 'no runs';
    console.log(`  ${tag.padEnd(6)} ${site.url.padEnd(34)} ${detail}`);
    if (!stable && !error) {
      console.log(`         signatures: ${[...signatures].join('  vs  ')}`);
    }
  }

  const failures = results.filter((r) => !r.stable);
  const totalRuns = results.reduce((n, r) => n + r.runs.length, 0);
  const totalMs = results.reduce((n, r) => n + r.runs.reduce((m, x) => m + x.durationMs, 0), 0);

  console.log(`\n  ${results.length - failures.length}/${results.length} stable · ${totalRuns} scans · ${fmt(totalMs)} total`);
  if (failures.length) {
    console.log(`\n  GATE NOT PASSED — ${failures.length} site(s) failed or drifted:`);
    for (const f of failures) console.log(`    ${f.url}${f.error ? ` — ${f.error}` : ''}`);
  } else {
    console.log('\n  GATE PASSED — every site produced the same findings on every run.');
  }
  console.log('');

  await mkdir(join(root, 'experiments'), { recursive: true });
  await writeFile(
    join(root, 'experiments', `battery-${new Date().toISOString().slice(0, 10)}.json`),
    JSON.stringify({ ranAt: new Date().toISOString(), runCount, results }, null, 2),
    'utf8',
  );

  await closeBrowser();
  process.exitCode = failures.length ? 1 : 0;
}

main().catch(async (error) => {
  console.error(error);
  await closeBrowser();
  process.exitCode = 2;
});
