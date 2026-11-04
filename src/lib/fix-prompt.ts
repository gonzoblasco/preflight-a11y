/**
 * The fix prompt.
 *
 * This is the product's central artifact. Everyone can detect accessibility
 * bugs. Almost nobody tells a non-technical founder *what to paste back into
 * the tool that generated the site*.
 *
 * Two rules make the prompt usable by an AI builder:
 *   1. Every step is scoped to a selector and ordered by impact, so the builder
 *      has a target instead of a wish.
 *   2. Every step ends with an announcement the reader must produce. The
 *      builder can verify its own work instead of guessing "looks good to me".
 */

import type { Finding, FixPrompt, FixStep, Score } from './types';
import { clip, type StepDraft } from './rules';

const IMPACT_ORDER: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

export interface PromptInput {
  url: string;
  score: Score;
  findings: Finding[];
  steps: { finding: Finding; nodeIndex: number; draft: StepDraft }[];
  /** Max steps to include. Beyond this the prompt gets ignored by builders. */
  maxSteps?: number;
}

/** Collapses selectors into the component they most likely live in. */
export function inferTarget(selector: string): string {
  const section = selector.match(/#([a-z0-9-]+)/i);
  if (section?.[1]) return `the section #${section[1]}`;
  const landmark = selector.match(/\b(header|nav|main|footer|aside|form|dialog)\b/i);
  if (landmark?.[1]) return `the <${landmark[1].toLowerCase()}> region`;
  return 'the element at the selector below';
}

export function buildFixPrompt(input: PromptInput): FixPrompt {
  const max = input.maxSteps ?? 12;

  const ordered = [...input.steps].sort((a, b) => {
    const byImpact = (IMPACT_ORDER[a.finding.impact] ?? 9) - (IMPACT_ORDER[b.finding.impact] ?? 9);
    if (byImpact !== 0) return byImpact;
    return a.finding.id.localeCompare(b.finding.id) || a.nodeIndex - b.nodeIndex;
  });

  // One step per rule: repeating "add alt" for nine images burns the context
  // window and teaches the builder nothing new.
  const seen = new Set<string>();
  const unique = ordered.filter((step) => {
    if (seen.has(step.finding.id)) return false;
    seen.add(step.finding.id);
    return true;
  });

  const selected = unique.slice(0, max);
  const omitted = unique.length - selected.length;

  const steps: FixStep[] = selected.map((step, index) => ({
    order: index + 1,
    target: step.draft.target,
    instruction: step.draft.instruction,
    snippet: step.draft.snippet,
    acceptance: step.draft.acceptance,
  }));

  const lines: string[] = [
    'You are fixing accessibility defects in a website you generated.',
    'Work through the steps in order. Do not redesign anything; do not change copy unless a step says so.',
    'After each step, confirm the "Reader must announce" line. If you cannot confirm it, stop and say which step failed.',
    '',
    `Page: ${input.url}`,
    `Current score: ${input.score.value}/100 (${input.score.grade}). Blocking issues: ${input.score.blocking}.`,
    '',
  ];

  if (steps.length === 0) {
    lines.push('No defects were found in this pass. Do not change the page.');
  }

  for (const step of steps) {
    const finding = selected[step.order - 1]?.finding;
    lines.push(`## Step ${step.order} — ${finding?.title ?? ''}`);
    lines.push(`Rule: ${finding?.id ?? ''} (${finding?.impact ?? ''}) · WCAG ${finding?.wcag.join(', ') || 'n/a'}`);
    lines.push(`Where: ${step.target}`);
    lines.push(`Selector: ${selected[step.order - 1]?.finding.nodes[0]?.selector ?? ''}`);
    if (finding?.nodes[0]?.html) {
      lines.push(`Current markup: ${clip(finding.nodes[0].html, 200)}`);
    }
    lines.push(`Do: ${step.instruction}`);
    if (step.snippet) {
      lines.push('Target markup:');
      lines.push('```html');
      lines.push(step.snippet);
      lines.push('```');
    }
    lines.push(`Reader must announce: ${step.acceptance}`);
    lines.push('');
  }

  if (omitted > 0) {
    lines.push(
      `(${omitted} further ${omitted === 1 ? 'issue is' : 'issues are'} not listed here. They are lower impact. Fix these first, re-run Preflight, then continue.)`,
    );
  }

  return { text: lines.join('\n'), steps };
}
