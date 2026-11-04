import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFixPrompt } from '../src/lib/fix-prompt';
import { narrate } from '../src/lib/narrate';
import { closeBrowser, ScanError, scanPage } from '../src/lib/scan';
import { scoreFindings } from '../src/lib/score';
import { guardUrl, isPrivateAddress } from '../src/lib/url-guard';

const here = dirname(fileURLToPath(import.meta.url));

let server: Server;
let base: string;

async function serve(path: string, status = 200): Promise<void> {
  const html = await readFile(join(here, 'fixtures', path), 'utf8');
  server.removeAllListeners('request');
  server.on('request', (_req, res) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}

beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(404);
    res.end('not found');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await closeBrowser();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('url guard', () => {
  it('classifies private ranges, including IPv4-mapped v6', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '192.168.1.1',
      '172.16.0.1',
      '169.254.169.254',
      '::1',
      'fd00::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '203.0.113.10']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it('refuses loopback and credentials before any fetch', async () => {
    expect((await guardUrl('http://127.0.0.1:3000')).ok).toBe(false);
    expect((await guardUrl('http://localhost:3000')).ok).toBe(false);
    expect((await guardUrl('https://user:pass@example.com')).ok).toBe(false);
    expect((await guardUrl('ftp://example.com')).ok).toBe(false);
    expect((await guardUrl('')).ok).toBe(false);
  });
});

describe('narration', () => {
  it('records nameless roles as gaps with a human reading', async () => {
    const html = await readFile(join(here, 'fixtures', 'bad.html'), 'utf8');
    const narration = await narrate(html);
    const roles = narration.gaps.map((g) => g.role);
    expect(roles).toContain('image');
    expect(roles).toContain('button');
    // A nameless list is normal markup; it must not be reported as a gap.
    expect(roles).not.toContain('list');
    expect(narration.gaps.every((g) => g.hears.length > 10)).toBe(true);
    expect(narration.phrases).toContain('heading, Ship faster, level 1');
    // Structural bookkeeping must not bury the signal.
    expect(narration.phrases).not.toContain('paragraph');
    expect(narration.phrases.some((p) => p.startsWith('listitem, level'))).toBe(false);
  });
});

describe('scanner', () => {
  it('scores a broken page and produces an ordered fix prompt', async () => {
    await serve('bad.html');
    const result = await scanPage(base);
    const ids = result.findings.map((f) => f.id);

    expect(ids).toContain('image-alt');
    expect(ids).toContain('button-name');
    // axe accepts a placeholder as a label; we flag it as its own signal.
    expect(ids).toContain('select-name');
    expect(result.signals.placeholderOnlyLabels).toBeGreaterThan(0);
    expect(ids).toContain('document-title');
    expect(result.score.blocking).toBeGreaterThan(0);
    expect(result.score.grade).not.toBe('A');
    expect(result.fixPrompt.steps.length).toBeGreaterThan(0);
    expect(result.fixPrompt.steps.every((s) => s.acceptance.length > 10)).toBe(true);
    expect(result.fixPrompt.text).toContain('Reader must announce');
    // One step per rule: no duplicate image-alt steps.
    const ruleCount = result.fixPrompt.steps.length;
    expect(new Set(result.fixPrompt.steps.map((s) => s.instruction)).size).toBe(ruleCount);
    expect(result.narration.gaps.length).toBeGreaterThan(0);
    expect(result.signals.lang).toBeNull();
  });

  it('surfaces an HTTP error as a readable scan error', async () => {
    await serve('bad.html', 500);
    await expect(scanPage(base)).rejects.toBeInstanceOf(ScanError);
  });

  /**
   * Regression for a false positive found on a live product (SoporteML): three
   * chips with a correct settled colour failed contrast because the scanner
   * sampled them mid-fade at ~52% opacity. The fixture reproduces that shape:
   * a correct `#575e6b` behind a staggered 0.5s opacity animation.
   */
  it('does not report contrast failures caused by entrance animations', async () => {
    await serve('animated.html');

    // Three runs: a race would appear intermittently, which is the whole point.
    for (let run = 1; run <= 3; run += 1) {
      const result = await scanPage(base);
      const contrast = result.findings.find((f) => f.id === 'color-contrast');
      expect(contrast, `run ${run}: contrast reported on a settled page`).toBeUndefined();
      expect(result.score.grade, `run ${run}`).toBe('A');
    }
  });
});

describe('scoring', () => {
  it('never awards an A to a page with blocking issues', () => {
    const score = scoreFindings([
      {
        id: 'button-name',
        impact: 'critical',
        title: 'x',
        plainLanguage: 'x',
        wcag: [],
        nodes: [{ selector: 'button', html: '<button>' }],
        livedExperience: null,
        remediation: 'x',
      },
    ]);
    expect(score.grade).not.toBe('A');
    expect(score.value).toBeLessThan(100);
  });

  it('caps the penalty for repeated nodes', () => {
    const node = { selector: 'img', html: '<img>' };
    const one = scoreFindings([
      {
        id: 'image-alt',
        impact: 'critical',
        title: 'x',
        plainLanguage: 'x',
        wcag: [],
        nodes: [node],
        livedExperience: null,
        remediation: 'x',
      },
    ]);
    const many = scoreFindings([
      {
        id: 'image-alt',
        impact: 'critical',
        title: 'x',
        plainLanguage: 'x',
        wcag: [],
        nodes: Array(40).fill(node),
        livedExperience: null,
        remediation: 'x',
      },
    ]);
    expect(one.value - many.value).toBeLessThanOrEqual(72);
    expect(many.value).toBeGreaterThanOrEqual(0);
  });
});

describe('fix prompt', () => {
  it('omits duplicates and states how many issues were withheld', () => {
    const finding = {
      id: 'image-alt',
      impact: 'critical' as const,
      title: 'Images must have alternative text',
      plainLanguage: 'x',
      wcag: ['1.1.1'],
      nodes: [{ selector: 'img.a', html: '<img class="a">' }],
      livedExperience: null,
      remediation: 'x',
    };
    const prompt = buildFixPrompt({
      url: 'https://example.com',
      score: {
        value: 40,
        grade: 'F',
        blocking: 3,
        byImpact: { critical: 3, serious: 0, moderate: 0, minor: 0 },
      },
      findings: [finding],
      steps: [
        {
          finding,
          nodeIndex: 0,
          draft: {
            target: 'the <header> region',
            instruction: 'Add alt.',
            acceptance: 'Reader says image, X.',
          },
        },
      ],
    });
    expect(prompt.steps).toHaveLength(1);
    expect(prompt.text).toContain('Current score: 40/100');
  });

  it('emits one step per element for per-element rules, one per rule for collective ones', () => {
    const node = (selector: string) => ({ selector, html: `<p class="${selector}">x</p>` });
    const contrast = {
      id: 'color-contrast',
      impact: 'serious' as const,
      title: 'Contrast',
      plainLanguage: 'x',
      wcag: ['1.4.3'],
      nodes: [node('a'), node('b')],
      livedExperience: null,
      remediation: 'x',
    };
    const images = {
      id: 'image-alt',
      impact: 'critical' as const,
      title: 'Images',
      plainLanguage: 'x',
      wcag: ['1.1.1'],
      nodes: [node('c'), node('d'), node('e')],
      livedExperience: null,
      remediation: 'x',
    };
    const step = (target: string) => ({ target, instruction: 'do', acceptance: 'verify this one' });

    const prompt = buildFixPrompt({
      url: 'https://example.com',
      score: {
        value: 50,
        grade: 'D',
        blocking: 2,
        byImpact: { critical: 3, serious: 2, moderate: 0, minor: 0 },
      },
      findings: [contrast, images],
      steps: [
        { finding: contrast, nodeIndex: 0, draft: step('.hero > p') },
        { finding: contrast, nodeIndex: 1, draft: step('footer span') },
        { finding: images, nodeIndex: 0, draft: step('img.a') },
        { finding: images, nodeIndex: 1, draft: step('img.b') },
        { finding: images, nodeIndex: 2, draft: step('img.c') },
      ],
    });

    const contrasts = prompt.steps.filter(
      (s) => s.target === '.hero > p' || s.target === 'footer span',
    );
    const imageSteps = prompt.steps.filter((s) => s.target.startsWith('img.'));
    // Two distinct contrast elements are two distinct repairs.
    expect(contrasts).toHaveLength(2);
    // Three images are one collective instruction.
    expect(imageSteps).toHaveLength(1);
  });
});
