/**
 * Scoring.
 *
 * A single number a founder can act on. It is deliberately blunt: a page that
 * blocks a task cannot score well no matter how many minor rules pass, because
 * "92/100 but checkout is unusable" is the kind of score that gets a tool
 * uninstalled.
 */

import type { AxeImpact, Finding, Grade, Score } from './types';

const WEIGHT: Record<AxeImpact, number> = {
  critical: 18,
  serious: 9,
  moderate: 3,
  minor: 1,
};

/** Rules whose failure stops a user from completing a task. */
const BLOCKING = new Set([
  'button-name',
  'link-name',
  'image-alt',
  'label',
  'select-name',
  'aria-hidden-focus',
  'nested-interactive',
  'scrollable-region-focusable',
  'color-contrast',
  'document-title',
  'html-has-lang',
]);

export function scoreFindings(findings: Finding[]): Score {
  const byImpact: Record<AxeImpact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let penalty = 0;
  let blocking = 0;

  for (const finding of findings) {
    byImpact[finding.impact] = (byImpact[finding.impact] ?? 0) + finding.nodes.length;
    // Diminishing returns: the tenth unstyled image is not ten times the harm.
    const nodes = Math.min(finding.nodes.length, 4);
    penalty += WEIGHT[finding.impact] * nodes;
    if (BLOCKING.has(finding.id)) blocking += finding.nodes.length;
  }

  const value = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  return { value, grade: gradeOf(value, blocking), blocking, byImpact };
}

function gradeOf(value: number, blocking: number): Grade {
  if (blocking > 0 && value > 84) return 'B';
  if (value >= 92) return 'A';
  if (value >= 84) return 'B';
  if (value >= 70) return 'C';
  if (value >= 50) return 'D';
  return 'F';
}

/** One sentence the report leads with. Never congratulates a broken page. */
export function verdict(score: Score): string {
  if (score.blocking === 0 && score.value >= 92) {
    return 'This page clears the pre-launch gate.';
  }
  if (score.blocking === 0) {
    return 'No blocking issues, but the page is not clean. Fix the items below before launch.';
  }
  const noun = score.blocking === 1 ? 'issue' : 'issues';
  return `${score.blocking} blocking ${noun} would stop a screen reader user from completing a task on this page.`;
}
