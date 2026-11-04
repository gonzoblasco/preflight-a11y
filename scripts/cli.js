#!/usr/bin/env node
/**
 * `npx preflight-a11y <url>` entry point.
 *
 * The real CLI is TypeScript. Running it through `tsx` keeps a single
 * implementation instead of a compiled copy that drifts, and Node 22+ ships the
 * tooling this needs. The cost is one extra process; the benefit is that the
 * published binary and the tested source are the same file.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, 'cli.ts');

// Node 26 deprecates module.register(), which tsx still uses. Silenced so a
// first-run user sees the report, not a warning about our tooling.
const child = spawn(
  process.execPath,
  ['--disable-warning=DEP0205', '--import', 'tsx', cli, ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
