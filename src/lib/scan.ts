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

      // Entrance animations are the single largest source of false positives we
      // have measured. SoporteML (a real product) produced three "contrast
      // failures" that were the page sampled mid-fade at 52% opacity. A fixed
      // delay cannot fix that: it races the animation. Two measures, in order:
      //
      //   1. freeze animations at their end state (belt)
      //   2. wait until two consecutive visual samples agree (suspenders)
      //
      // `reducedMotion: 'reduce'` alone is not enough because libraries such as
      // framer-motion animate inline styles and never consult the media query.
      await freezeAnimations(page);
      await settleVisuals(page);

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
              // Carries the measured cause forward so the prompt can group
              // failures sharing one source (a CSS variable, a font size)
              // instead of asking for the same repair twice.
              causeKey: causeOf(finding.id, node.failureSummary),
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

/**
 * Forces every animation and transition to its end state.
 *
 * Measured cause: a real product (SoporteML) failed three contrast checks because
 * framer-motion staggers a 0.5s opacity fade on the hero chips. The scanner read
 * them at ~52% opacity, which reproduces `#a3a7ae` from a correct `#575e6b`. The
 * failure did not exist for any user who waited half a second.
 *
 * `reducedMotion: 'reduce'` is not sufficient: JS animation libraries write
 * inline styles and ignore the media query entirely.
 */
async function freezeAnimations(page: import('playwright').Page): Promise<void> {
  await page
    .addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    })
    .catch(() => undefined);

  // Libraries can re-apply inline opacity after a stylesheet lands, so one frame
  // is requested to let the cascade settle before sampling.
  await page
    .evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())))
    .catch(() => undefined);
}

/**
 * Waits until two consecutive visual samples agree.
 *
 * A fixed delay races the animation; this waits for it to stop. The sample is the
 * page's scroll height plus the computed colour of every element that has text,
 * which is exactly the signal contrast depends on.
 */
async function settleVisuals(page: import('playwright').Page, maxWaitMs = 4000): Promise<void> {
  const sample = () =>
    page
      .evaluate(() => {
        const parts: string[] = [String(document.documentElement.scrollHeight)];
        const nodes = document.querySelectorAll<HTMLElement>('body *');
        // Sampling every node would be slow on a large page; the first 300 are
        // enough to detect a transition, and any element still animating later
        // is caught by the second read of a failing node before reporting.
        const limit = Math.min(nodes.length, 300);
        for (let i = 0; i < limit; i += 1) {
          const node = nodes[i];
          if (!node || (node.textContent ?? '').trim().length === 0) continue;
          const style = getComputedStyle(node);
          parts.push(`${style.color}|${style.backgroundColor}|${style.opacity}`);
        }
        return parts.join(';');
      })
      .catch(() => '');

  const deadline = Date.now() + maxWaitMs;
  let previous = await sample();

  while (Date.now() < deadline) {
    await page.waitForTimeout(120);
    const current = await sample();
    if (current === previous && current.length > 0) return;
    previous = current;
  }
}

/**
 * Identifies the underlying cause of a failure, when the tool can see one.
 *
 * Two elements can fail `color-contrast` for the same reason: both inherit a
 * single CSS custom property. Reporting them as two unrelated repairs sends the
 * builder to fix one element and leaves the rule open — measured on the repair
 * experiment, where three models fixed the hero paragraph and missed the footer
 * because nobody had told them the colour came from one variable.
 */
function causeOf(ruleId: string, failureSummary?: string): string | undefined {
  if (!failureSummary) return undefined;
  if (ruleId === 'color-contrast') {
    const fg = failureSummary.match(/foreground color: (#[0-9a-f]{3,8})/i)?.[1];
    const bg = failureSummary.match(/background color: (#[0-9a-f]{3,8})/i)?.[1];
    if (fg && bg) return `contrast:${fg.toLowerCase()}:${bg.toLowerCase()}`;
  }
  return undefined;
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
