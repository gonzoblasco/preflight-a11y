/**
 * The scanner: load a page, collect signal, then narrate it.
 *
 * Design notes that matter:
 *  - One browser, reused across scans. Launching Chromium per request costs
 *    ~1.2s and leaks processes under load.
 *  - The page is loaded with a real Chrome channel, not the bundled shell,
 *    because the accessibility tree of headless-shell differs from what users
 *    actually run.
 *  - Timeouts are hard: a scan that hangs must fail visibly, not eat a worker.
 */

import AxeBuilder from '@axe-core/playwright';
import { type Browser, chromium } from 'playwright';
import { buildFixPrompt, inferTarget } from './fix-prompt';
import { narrate } from './narrate';
import { fallbackCopy, RULES, type StepDraft } from './rules';
import { scoreFindings } from './score';
import type { AxeImpact, Finding, PageSignals, ScanResult } from './types';

const NAV_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 45_000;
const MAX_HTML_BYTES = 3_000_000;

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        channel: process.env.PREFLIGHT_CHANNEL ?? 'chrome',
        headless: true,
        args: ['--disable-dev-shm-usage'],
      })
      .catch((error: unknown) => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  if (pending) {
    const browser = await pending.catch(() => null);
    await browser?.close().catch(() => undefined);
  }
}

export interface ScanOptions {
  /** Override the browser channel, e.g. for CI without system Chrome. */
  channel?: string;
  /** Called when the scan fails at any stage, for the job log. */
  onProgress?: (stage: string) => void;
}

/**
 * Runs a full scan: render, collect axe violations, read the narration, build
 * the fix prompt. Throws a typed error with a human reason on failure.
 */
export async function scanPage(url: string, options: ScanOptions = {}): Promise<ScanResult> {
  const started = Date.now();
  const progress = options.onProgress ?? (() => undefined);
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), TOTAL_BUDGET_MS);

  if (options.channel) process.env.PREFLIGHT_CHANNEL = options.channel;

  try {
    progress('launching browser');
    const browser = await getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      locale: 'en-US',
    });

    // Bundlers that preserve function names (esbuild/tsx) inject a `__name`
    // helper into every function they emit. `page.evaluate` serializes those
    // functions into the page, where the helper does not exist. Defining a
    // no-op keeps the bundle honest instead of disabling keepNames, which we
    // want for readable stack traces.
    await context.addInitScript(() => {
      const scope = globalThis as unknown as { __name?: (fn: unknown) => unknown };
      if (!scope.__name) scope.__name = (fn) => fn;
    });

    try {
      const page = await context.newPage();
      page.setDefaultTimeout(NAV_TIMEOUT_MS);

      progress('loading page');
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_MS,
      });

      if (!response) throw new ScanError('The site did not respond. Check the URL and try again.');
      if (response.status() >= 400) {
        throw new ScanError(
          `The site returned HTTP ${response.status()}. A public page is required.`,
        );
      }

      // Let hydration settle: scanning a skeleton produces false findings.
      await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(600);

      progress('analyzing');
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();

      progress('collecting signals');
      const signals = await collectSignals(page);

      const html = await page.content();
      const finalUrl = page.url();

      progress('reading with a screen reader');
      const narration = await narrate(html.slice(0, MAX_HTML_BYTES));

      const findings: Finding[] = axe.violations.map((violation) => {
        const copy =
          RULES[violation.id] ??
          fallbackCopy(violation.id, violation.help, violation.description, violation.tags ?? []);

        return {
          id: violation.id,
          impact: (violation.impact ?? 'moderate') as AxeImpact,
          title: violation.help,
          plainLanguage: copy.plainLanguage,
          wcag: copy.wcag,
          nodes: violation.nodes.map((node) => ({
            selector: node.target.join(' >>> '),
            html: Array.isArray(node.html) ? node.html.join('') : String(node.html ?? ''),
            failureSummary: node.failureSummary,
          })),
          livedExperience: copy.livedExperience,
          remediation: copy.remediation,
        };
      });

      const score = scoreFindings(findings);

      const steps: { finding: Finding; nodeIndex: number; draft: StepDraft }[] = [];
      for (const finding of findings) {
        const copy =
          RULES[finding.id] ??
          fallbackCopy(finding.id, finding.remediation, finding.plainLanguage, []);
        finding.nodes.forEach((node, nodeIndex) => {
          const draft = copy.fix({
            selector: node.selector,
            html: node.html,
            failureSummary: node.failureSummary,
          });
          steps.push({
            finding,
            nodeIndex,
            draft: {
              ...draft,
              target: draft.target === node.selector ? inferTarget(node.selector) : draft.target,
            },
          });
        });
      }

      const fixPrompt = buildFixPrompt({
        url: finalUrl,
        score,
        findings,
        steps,
      });

      progress('done');

      return {
        id: crypto.randomUUID(),
        url,
        finalUrl,
        title: signals.documentTitle ?? finalUrl,
        scannedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        score,
        findings: findings.sort(
          (a, b) =>
            ({ critical: 0, serious: 1, moderate: 2, minor: 3 })[a.impact] -
            { critical: 0, serious: 1, moderate: 2, minor: 3 }[b.impact],
        ),
        narration,
        signals,
        fixPrompt,
        limits: [
          'Automated checks catch roughly a third of accessibility defects. Manual testing with a keyboard and a real screen reader is still required.',
          'The narration comes from a virtual screen reader, not VoiceOver or NVDA. It reflects what the DOM declares, not how a specific reader times its announcements.',
          'Content behind interaction (modals, tabs, menus) is only scanned if it is open on load.',
          'Only the single URL you entered is scanned; linked pages are not followed.',
        ],
      };
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch (error) {
    if (error instanceof ScanError) throw error;
    if (controller.signal.aborted) {
      throw new ScanError(`The scan took longer than ${TOTAL_BUDGET_MS / 1000}s and was stopped.`);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/net::ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(message)) {
      throw new ScanError('That domain did not resolve.');
    }
    if (/net::ERR_CONNECTION|ECONNREFUSED/i.test(message)) {
      throw new ScanError('The site refused the connection.');
    }
    if (/Timeout/i.test(message)) {
      throw new ScanError('The site took too long to load.');
    }
    throw new ScanError(`The scan failed: ${message.split('\n')[0]}`);
  } finally {
    clearTimeout(budget);
  }
}

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanError';
  }
}

async function collectSignals(page: import('playwright').Page): Promise<PageSignals> {
  return page.evaluate(() => {
    const q = <T extends Element>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

    const accessibleName = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria?.trim()) return aria.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim();
        if (text) return text;
      }
      const text = (el.textContent ?? '').trim();
      if (text) return text;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.labels?.length) {
          const fromLabel = Array.from(el.labels)
            .map((l) => l.textContent ?? '')
            .join(' ')
            .trim();
          if (fromLabel) return fromLabel;
        }
        return el.placeholder?.trim() ?? '';
      }
      const img = el.querySelector('img[alt]');
      if (img) return img.getAttribute('alt')?.trim() ?? '';
      const title = el.getAttribute('title');
      return title?.trim() ?? '';
    };

    const interactive = q<HTMLElement>(
      'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const named = interactive.filter((el) => accessibleName(el).length > 0).length;

    const headings = q<HTMLElement>('h1,h2,h3,h4,h5,h6').map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: (el.textContent ?? '').trim().slice(0, 120),
    }));

    const firstFocusable = document.querySelector<HTMLElement>('a[href]');
    const hasSkipLink = Boolean(
      firstFocusable &&
        /skip|jump/i.test(firstFocusable.textContent ?? '') &&
        firstFocusable.getBoundingClientRect().height > 0,
    );

    return {
      lang: document.documentElement.getAttribute('lang'),
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? null,
      headingOutline: headings,
      interactiveCount: interactive.length,
      namedRatio: interactive.length === 0 ? 1 : named / interactive.length,
      imagesWithoutAlt: q('img:not([alt])').length,
      formsWithoutLabels: q<HTMLElement>('input:not([type="hidden"]), select, textarea').filter(
        (el) => !accessibleName(el),
      ).length,
      // A placeholder is not a label: it disappears the moment the user types,
      // and some readers skip it entirely. axe accepts it, users do not.
      placeholderOnlyLabels: q<HTMLElement>('input:not([type="hidden"]), textarea').filter((el) => {
        const input = el as HTMLInputElement;
        const hasLabelElement = Boolean(input.labels?.length);
        const hasAria =
          Boolean(el.getAttribute('aria-label')?.trim()) ||
          Boolean(el.getAttribute('aria-labelledby')?.trim());
        return !hasLabelElement && !hasAria && Boolean(el.getAttribute('placeholder')?.trim());
      }).length,
      hasSkipLink,
      documentTitle: document.title || null,
    };
  });
}
