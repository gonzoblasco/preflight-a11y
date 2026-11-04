#!/usr/bin/env node

/**
 * Verify a repair a human pasted back.
 *
 * Phase 0.2 of the roadmap: the fix prompt must work in the tools customers
 * actually use. Those tools need a logged-in human, so the loop is:
 *
 *   you paste the prompt  →  you save the result  →  this script judges it
 *
 * The judgement is not "looks better". It re-scans the artifact with the same
 * engine and reports what closed, what persisted, what appeared, and whether
 * the page survived intact. A model can close a finding by deleting the thing
 * that failed, and that must never count as a repair.
 *
 * Usage:
 *   node scripts/verify-repair.mjs <repaired.html> [--label v0]
 *   node scripts/verify-repair.mjs --all          # verify everything saved
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeBrowser, scanPage } from '../src/lib/scan.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const phaseDir = join(root, '.knowledge/phase-0.2');
const sourcePath = join(phaseDir, 'source.html');
const outDir = join(phaseDir, 'results');

/** Strips markdown fences and prose a builder may wrap around the document. */
function extractHtml(text) {
  const fenced = text.match(/```(?:html)?\s*\n([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.search(/<!doctype html|<html/i);
  if (start === -1) return null;
  const end = body.lastIndexOf('</html>');
  return end === -1 ? body.slice(start) : body.slice(start, end + 7);
}

async function serve(html) {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

/** Visual/content preservation: the repair must not win by deletion. */
function contentShape(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    words: text ? text.split(' ').length : 0,
    images: (html.match(/<img\b/gi) ?? []).length,
    links: (html.match(/<a\b/gi) ?? []).length,
    headings: (html.match(/<h[1-6]\b/gi) ?? []).length,
    buttons: (html.match(/<button\b/gi) ?? []).length,
    inputs: (html.match(/<input\b/gi) ?? []).length,
  };
}

function compareShape(before, after) {
  const lost = [];
  if (after.words < before.words * 0.85)
    lost.push(`text dropped ${before.words} → ${after.words} words`);
  if (after.images < before.images) lost.push(`images deleted ${before.images} → ${after.images}`);
  if (after.links < before.links) lost.push(`links deleted ${before.links} → ${after.links}`);
  if (after.buttons < before.buttons)
    lost.push(`buttons deleted ${before.buttons} → ${after.buttons}`);
  if (after.inputs < before.inputs) lost.push(`inputs deleted ${before.inputs} → ${after.inputs}`);
  return { ok: lost.length === 0, problems: lost };
}

async function verify(file, label) {
  const raw = await readFile(file, 'utf8');
  const repaired = extractHtml(raw);
  if (!repaired) {
    return { label, ok: false, error: 'No HTML document found in the file.' };
  }

  const sourceHtml = await readFile(sourcePath, 'utf8');

  const before = await serve(sourceHtml);
  const baseline = await scanPage(before.url);
  await before.close();

  const after = await serve(repaired);
  const rescanned = await scanPage(after.url);
  await after.close();

  const beforeIds = new Set(baseline.findings.map((f) => f.id));
  const afterIds = new Set(rescanned.findings.map((f) => f.id));
  const closed = [...beforeIds].filter((id) => !afterIds.has(id));
  const persisted = [...beforeIds].filter((id) => afterIds.has(id));
  const introduced = [...afterIds].filter((id) => !beforeIds.has(id));

  const shape = compareShape(contentShape(sourceHtml), contentShape(repaired));

  return {
    label,
    ok: true,
    scoreBefore: baseline.score.value,
    scoreAfter: rescanned.score.value,
    gradeBefore: baseline.score.grade,
    gradeAfter: rescanned.score.grade,
    blockingBefore: baseline.score.blocking,
    blockingAfter: rescanned.score.blocking,
    closed,
    persisted,
    introduced,
    totalBefore: beforeIds.size,
    closedRatio: Number((closed.length / beforeIds.size).toFixed(2)),
    layoutIntact: shape.ok,
    layoutProblems: shape.problems,
  };
}

function render(result) {
  if (!result.ok) return `  ${result.label}: FAILED — ${result.error}`;
  const layout = result.layoutIntact ? 'intact' : `DAMAGED (${result.layoutProblems.join('; ')})`;
  return [
    `  ${result.label}`,
    `    score      ${result.scoreBefore} ${result.gradeBefore} → ${result.scoreAfter} ${result.gradeAfter}`,
    `    blocking   ${result.blockingBefore} → ${result.blockingAfter}`,
    `    closed     ${result.closed.length}/${result.totalBefore} (${Math.round(result.closedRatio * 100)}%)`,
    result.persisted.length ? `    persisted  ${result.persisted.join(', ')}` : null,
    result.introduced.length ? `    introduced ${result.introduced.join(', ')}` : null,
    `    content    ${layout}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  await mkdir(outDir, { recursive: true });

  const targets = [];
  if (args.includes('--all')) {
    const entries = await readdir(phaseDir);
    for (const entry of entries) {
      if (entry.endsWith('.html') && entry !== 'source.html') {
        targets.push({ file: join(phaseDir, entry), label: basename(entry, '.html') });
      }
    }
    if (targets.length === 0) {
      console.log("Nothing to verify. Save a builder's output as .knowledge/phase-0.2/<name>.html");
      return;
    }
  } else {
    const file = args.find((a) => !a.startsWith('--'));
    if (!file) {
      console.log('Usage: node scripts/verify-repair.mjs <repaired.html> [--label v0]');
      console.log('       node scripts/verify-repair.mjs --all');
      process.exitCode = 2;
      return;
    }
    const labelIndex = args.indexOf('--label');
    const label =
      labelIndex !== -1
        ? (args[labelIndex + 1] ?? basename(file, '.html'))
        : basename(file, '.html');
    targets.push({ file, label });
  }

  if (!existsSync(sourcePath)) {
    console.log(`Missing ${sourcePath}. Run the prompt generator first.`);
    process.exitCode = 2;
    return;
  }

  console.log('\n  Phase 0.2 — repair verification\n');
  const results = [];
  for (const target of targets) {
    const result = await verify(target.file, target.label);
    results.push(result);
    console.log(render(result));
    console.log('');
  }

  const good = results.filter((r) => r.ok);
  const passing = good.filter((r) => r.closedRatio >= 0.625 && r.layoutIntact);
  const verdict =
    good.length === 0
      ? 'No artifact could be read.'
      : passing.length >= 2
        ? `GATE PASSED — ${passing.length} of ${good.length} builders closed >= 5/8 findings without damaging the page.`
        : `GATE NOT PASSED — ${passing.length} of ${good.length} builders meet both conditions (>= 5/8 closed, layout intact).`;

  console.log(`  ${verdict}\n`);

  await writeFile(
    join(outDir, `verify-${new Date().toISOString().slice(0, 10)}.json`),
    JSON.stringify({ ranAt: new Date().toISOString(), results, verdict }, null, 2),
    'utf8',
  );

  await closeBrowser();
}

main().catch(async (error) => {
  console.error(error);
  await closeBrowser();
  process.exitCode = 1;
});
