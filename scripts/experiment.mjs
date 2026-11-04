#!/usr/bin/env node

/**
 * The repair-loop experiment.
 *
 * The product's core claim is "paste this prompt into your AI builder and it
 * fixes the page". That claim is worthless as an anecdote and decisive as a
 * number. This harness measures it:
 *
 *   1. scan the fixture (a page in the shape AI builders produce)
 *   2. send the generated fix prompt, verbatim, to a code model
 *   3. take the HTML it returns, scan it again with the same engine
 *   4. report which findings closed, which stayed, which appeared
 *
 * Using a model API instead of the Lovable/v0 UI is a deliberate trade: it
 * cannot test their editor, but it does test the thing being sold — whether an
 * AI builder can execute the prompt — with a reproducible, re-scannable artifact.
 *
 * Run: npx tsx scripts/experiment.mjs <model> [--runs N]
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeBrowser, scanPage } from '../src/lib/scan.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const OLLAMA = process.env.OLLAMA_BASE ?? 'http://127.0.0.1:11434';

const model = process.argv[2] ?? 'gpt-oss:120b-cloud';
const runCount = Number(process.argv[4] ?? 1);

async function serveHtml(html) {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

/** Strips markdown fences and any prose the model wrapped around the document. */
function extractHtml(text) {
  const fenced = text.match(/```(?:html)?\s*\n([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.search(/<!doctype html|<html/i);
  if (start === -1) return null;
  const end = body.lastIndexOf('</html>');
  return end === -1 ? body.slice(start) : body.slice(start, end + 7);
}

async function askModel(prompt) {
  const started = Date.now();
  const response = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.2, num_predict: 8192 },
      messages: [
        {
          role: 'system',
          content:
            'You are a code editor. You receive a complete HTML document and a numbered list of accessibility fixes. Return ONLY the corrected HTML document, complete, with no explanation and no markdown fences.',
        },
        {
          role: 'user',
          content: `Here is the document:\n\n\`\`\`html\n${prompt.html}\n\`\`\`\n\nHere are the fixes to apply, in order:\n\n${prompt.fixPrompt.text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const data = await response.json();
  return {
    text: data.message?.content ?? '',
    ms: Date.now() - started,
    evalCount: data.eval_count ?? 0,
  };
}

async function main() {
  await mkdir(join(root, 'experiments'), { recursive: true });
  const sourceHtml = await readFile(join(root, 'test/fixtures/ai-generated.html'), 'utf8');

  const before = await serveHtml(sourceHtml);
  const baseline = await scanPage(before.url);
  before.close();

  console.log(`\n  model: ${model}`);
  console.log(
    `  baseline: ${baseline.score.value}/100 ${baseline.score.grade} · ${baseline.findings.length} findings · ${baseline.score.blocking} blocking`,
  );
  console.log(`  rules: ${baseline.findings.map((f) => f.id).join(', ')}\n`);

  const runs = [];
  for (let run = 1; run <= runCount; run += 1) {
    console.log(`  run ${run}/${runCount}: asking the model…`);
    let reply;
    try {
      reply = await askModel({ html: sourceHtml, fixPrompt: baseline.fixPrompt });
    } catch (error) {
      console.log(`    failed: ${error.message}`);
      runs.push({ run, ok: false, error: error.message });
      continue;
    }

    const repaired = extractHtml(reply.text);
    if (!repaired) {
      console.log('    no HTML document found in the reply');
      runs.push({ run, ok: false, error: 'no html in reply' });
      continue;
    }

    const after = await serveHtml(repaired);
    const rescanned = await scanPage(after.url);
    after.close();

    const beforeIds = new Set(baseline.findings.map((f) => f.id));
    const afterIds = new Set(rescanned.findings.map((f) => f.id));
    const closed = [...beforeIds].filter((id) => !afterIds.has(id));
    const persisted = [...beforeIds].filter((id) => afterIds.has(id));
    const introduced = [...afterIds].filter((id) => !beforeIds.has(id));

    console.log(
      `    ${rescanned.score.value}/100 ${rescanned.score.grade} · closed ${closed.length}/${beforeIds.size} · still open ${persisted.length} · new ${introduced.length}`,
    );
    if (persisted.length) console.log(`    still open: ${persisted.join(', ')}`);
    if (introduced.length) console.log(`    introduced: ${introduced.join(', ')}`);

    runs.push({
      run,
      ok: true,
      scoreBefore: baseline.score.value,
      scoreAfter: rescanned.score.value,
      gradeAfter: rescanned.score.grade,
      closed,
      persisted,
      introduced,
      totalBefore: beforeIds.size,
      latencyMs: reply.ms,
      outputTokens: reply.evalCount,
      repaired,
    });

    await writeFile(
      join(root, 'experiments', `repaired-${model.replace(/[^\w.-]/g, '_')}-${run}.html`),
      repaired,
      'utf8',
    );
  }

  const good = runs.filter((r) => r.ok);
  const summary = {
    model,
    ranAt: new Date().toISOString(),
    baseline: {
      score: baseline.score.value,
      grade: baseline.score.grade,
      findings: baseline.findings.map((f) => f.id),
    },
    runs: runs.map((r) => (r.ok ? { ...r, repaired: undefined } : r)),
    totals: good.length
      ? {
          runs: good.length,
          meanScoreAfter: Math.round(good.reduce((a, r) => a + r.scoreAfter, 0) / good.length),
          meanClosedRatio:
            Math.round(
              (good.reduce((a, r) => a + r.closed.length / r.totalBefore, 0) / good.length) * 100,
            ) / 100,
          meanLatencyMs: Math.round(good.reduce((a, r) => a + r.latencyMs, 0) / good.length),
          meanOutputTokens: Math.round(good.reduce((a, r) => a + r.outputTokens, 0) / good.length),
          introducedTotal: good.reduce((a, r) => a + r.introduced.length, 0),
        }
      : null,
  };

  const out = join(root, 'experiments', `result-${model.replace(/[^\w.-]/g, '_')}.json`);
  await writeFile(out, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n  --- summary ---');
  console.log(JSON.stringify(summary.totals, null, 2));
  console.log(`\n  written to ${out}`);

  await closeBrowser();
}

main().catch(async (error) => {
  console.error(error);
  await closeBrowser();
  process.exitCode = 1;
});
