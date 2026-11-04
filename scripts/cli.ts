#!/usr/bin/env node
/**
 * Preflight CLI.
 *
 * The report is the product, but the CLI is the distribution: a founder is
 * reached once, a developer is reached every commit. `npx preflight <url>`
 * prints the transcript and the fix prompt, and can fail a build with a
 * threshold — which is what makes it a *gate* instead of a dashboard.
 *
 * Exit codes: 0 pass, 1 threshold failed, 2 usage/scan error.
 */

import { writeFile } from 'node:fs/promises';
import { closeBrowser, ScanError, scanPage } from '../src/lib/scan';
import { verdict } from '../src/lib/score';
import { guardUrl } from '../src/lib/url-guard';

interface Args {
  url: string | null;
  json: boolean;
  markdown: boolean;
  out: string | null;
  minScore: number | null;
  failOnBlocking: boolean;
  transcript: boolean;
  prompt: boolean;
  allowPrivate: boolean;
  help: boolean;
}

const HELP = `
preflight — the pre-launch accessibility gate for AI-built sites

Usage
  preflight <url> [options]

Options
  --min-score <n>      Exit 1 when the score is below n (0-100).
  --fail-on-blocking   Exit 1 when any finding blocks a task. Default in CI.
  --json               Print the full ScanResult as JSON.
  --markdown           Print a markdown report (good for PR comments).
  --out <file>         Write the report to a file.
  --no-transcript      Omit the screen-reader transcript from stdout.
  --no-prompt          Omit the fix prompt from stdout.
  --public-only        Refuse localhost and private addresses. The CLI allows
                       them by default because it runs on your own machine:
                       blocking your own dev server protects nobody.
  -h, --help           This text.

Exit codes
  0  pass      1  gate failed      2  usage or scan error

Examples
  preflight example.com
  preflight https://acme.dev --min-score 90 --fail-on-blocking
  preflight https://acme.dev --markdown --out report.md
`.trim();

function parse(argv: string[]): Args {
  const args: Args = {
    url: null,
    json: false,
    markdown: false,
    out: null,
    minScore: null,
    failOnBlocking: Boolean(process.env.CI),
    transcript: true,
    prompt: true,
    // The SSRF guard exists to stop a *server* from being pointed at its own
    // network by a stranger. In the CLI, the caller and the machine are the same
    // person, so blocking localhost only hides the primary use case: scanning a
    // page before it ships.
    allowPrivate: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '--json':
        args.json = true;
        break;
      case '--markdown':
        args.markdown = true;
        break;
      case '--fail-on-blocking':
        args.failOnBlocking = true;
        break;
      case '--no-transcript':
        args.transcript = false;
        break;
      case '--no-prompt':
        args.prompt = false;
        break;
      // Kept so an existing script does not break; it is now the default.
      case '--allow-private':
        args.allowPrivate = true;
        break;
      case '--public-only':
        args.allowPrivate = false;
        break;
      case '--out':
        args.out = argv[++i] ?? null;
        break;
      case '--min-score': {
        const value = Number(argv[++i]);
        args.minScore = Number.isFinite(value) ? value : null;
        break;
      }
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
        if (args.url) throw new Error('Only one URL per run.');
        args.url = arg;
    }
  }

  return args;
}

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  dim: (s: string) => (COLOR ? `\u001b[2m${s}\u001b[0m` : s),
  bold: (s: string) => (COLOR ? `\u001b[1m${s}\u001b[0m` : s),
  red: (s: string) => (COLOR ? `\u001b[31m${s}\u001b[0m` : s),
  yellow: (s: string) => (COLOR ? `\u001b[33m${s}\u001b[0m` : s),
  green: (s: string) => (COLOR ? `\u001b[32m${s}\u001b[0m` : s),
};

function gradeColor(grade: string, blocking: number): (s: string) => string {
  if (blocking > 0) return c.red;
  if (grade === 'A' || grade === 'B') return c.green;
  if (grade === 'C') return c.yellow;
  return c.red;
}

function printHuman(result: Awaited<ReturnType<typeof scanPage>>, args: Args): void {
  const paint = gradeColor(result.score.grade, result.score.blocking);
  console.log('');
  console.log(`  ${c.bold(result.title)}`);
  console.log(`  ${c.dim(result.finalUrl)}`);
  console.log('');
  console.log(
    `  ${paint(`${result.score.value}/100  ${result.score.grade}`)}  ${verdict(result.score)}`,
  );
  console.log('');

  if (args.transcript) {
    console.log(
      `  ${c.bold('WHAT A SCREEN READER SAYS')}  ${c.dim(`(${result.narration.matrix.reader} ${result.narration.matrix.version})`)}`,
    );
    const gapAt = new Map(result.narration.gaps.map((g) => [g.at, g]));
    result.narration.phrases.slice(0, 60).forEach((phrase, index) => {
      const gap = gapAt.get(index);
      if (gap) {
        console.log(
          `  ${c.red('!')} ${c.dim(String(index + 1).padStart(3))}  ${phrase}  ${c.dim(`← ${gap.hears}`)}`,
        );
      } else {
        console.log(`    ${c.dim(String(index + 1).padStart(3))}  ${phrase}`);
      }
    });
    if (result.narration.phrases.length > 60) {
      console.log(c.dim(`    … ${result.narration.phrases.length - 60} more phrases`));
    }
    console.log('');
  }

  if (result.findings.length > 0) {
    console.log(`  ${c.bold('FINDINGS')}`);
    for (const finding of result.findings) {
      const paint2 =
        finding.impact === 'critical' || finding.impact === 'serious' ? c.red : c.yellow;
      console.log(
        `  ${paint2(finding.impact.padEnd(8))} ${finding.title} ${c.dim(`(${finding.nodes.length}×)`)}`,
      );
    }
    console.log('');
  }

  if (args.prompt && result.fixPrompt.steps.length > 0) {
    console.log(`  ${c.bold('FIX PROMPT')} ${c.dim('— paste into Lovable, Cursor or v0')}`);
    console.log(
      result.fixPrompt.text
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n'),
    );
    console.log('');
  }

  console.log(`  ${c.bold('WHAT THIS CANNOT SEE')}`);
  for (const limit of result.limits) console.log(`  ${c.dim('·')} ${limit}`);
  console.log('');
}

function printMarkdown(result: Awaited<ReturnType<typeof scanPage>>): string {
  const lines: string[] = [];
  lines.push(`## Preflight: ${result.score.value}/100 (${result.score.grade})`);
  lines.push('');
  lines.push(`**${result.title}** — ${result.finalUrl}`);
  lines.push('');
  lines.push(`> ${verdict(result.score)}`);
  lines.push('');

  if (result.findings.length > 0) {
    lines.push('| Impact | Issue | Elements | WCAG |');
    lines.push('| --- | --- | --- | --- |');
    for (const f of result.findings) {
      lines.push(`| ${f.impact} | ${f.title} | ${f.nodes.length} | ${f.wcag.join(', ') || '—'} |`);
    }
    lines.push('');
  }

  const gaps = result.narration.gaps.slice(0, 8);
  if (gaps.length > 0) {
    lines.push('### What a screen reader says');
    lines.push('');
    for (const gap of gaps) {
      lines.push(`- \`${gap.phrase}\` — ${gap.hears}`);
    }
    lines.push('');
  }

  if (result.fixPrompt.steps.length > 0) {
    lines.push('<details><summary>Fix prompt</summary>');
    lines.push('');
    lines.push('```text');
    lines.push(result.fixPrompt.text);
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('<details><summary>What this scan cannot see</summary>');
  lines.push('');
  for (const l of result.limits) lines.push(`- ${l}`);
  lines.push('');
  lines.push('</details>');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = parse(process.argv.slice(2));

  if (args.help) {
    console.log(HELP);
    return;
  }
  if (!args.url) {
    console.error('preflight: a URL is required. Try `preflight --help`.');
    process.exitCode = 2;
    return;
  }

  const guard = await guardUrl(args.url, { allowPrivate: args.allowPrivate });
  if (!guard.ok || !guard.url) {
    console.error(`preflight: ${guard.reason}`);
    process.exitCode = 2;
    return;
  }

  const result = await scanPage(guard.url.toString(), {
    onProgress: (stage) => {
      if (process.stderr.isTTY && !args.json) process.stderr.write(`\r  ${c.dim(stage)}…`);
    },
  });

  if (process.stderr.isTTY && !args.json) process.stderr.write('\r\u001b[2K');

  const output = args.json
    ? JSON.stringify(result, null, 2)
    : args.markdown
      ? printMarkdown(result)
      : '';

  if (output) {
    console.log(output);
  } else {
    printHuman(result, args);
  }

  if (args.out) {
    await writeFile(
      args.out,
      args.json ? output : args.markdown ? output : printMarkdown(result),
      'utf8',
    );
    console.error(`preflight: report written to ${args.out}`);
  }

  const failed =
    (args.minScore !== null && result.score.value < args.minScore) ||
    (args.failOnBlocking && result.score.blocking > 0);

  process.exitCode = failed ? 1 : 0;
}

main()
  .catch((error: unknown) => {
    if (error instanceof ScanError) {
      console.error(`preflight: ${error.message}`);
    } else {
      console.error(`preflight: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exitCode = 2;
  })
  .finally(() => {
    void closeBrowser();
  });
