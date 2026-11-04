/**
 * Core types of a Preflight scan.
 *
 * The shape is intentionally *evidence-first*: every finding carries what the
 * tool observed, not only a rule id. A report that says "image-alt" is a lint
 * output; a report that says *the reader announced "image" and the user has no
 * idea what it was* is a product.
 */

/** Impact buckets, as reported by axe-core. Kept verbatim so nothing is lost. */
export type AxeImpact = 'minor' | 'moderate' | 'serious' | 'critical';

/** A single element the tool could point at. */
export interface FindingNode {
  /** CSS selector path, usable to locate the element in devtools. */
  selector: string;
  /** Outer HTML, truncated. The evidence a developer can paste. */
  html: string;
  /** The rule's own explanation for this node, when axe provides one. */
  failureSummary?: string;
}

/** One accessibility problem, grouped by rule. */
export interface Finding {
  id: string;
  impact: AxeImpact;
  /** Short human title, e.g. "Buttons must have discernible text". */
  title: string;
  /** Plain-language explanation written for a non-developer founder. */
  plainLanguage: string;
  /** WCAG success criteria this maps to, e.g. ["4.1.2", "2.4.4"]. */
  wcag: string[];
  nodes: FindingNode[];
  /** How a screen reader user is actually affected. Null when not modelled. */
  livedExperience: string | null;
  /** Remediation hint, in imperative form. */
  remediation: string;
}

/**
 * What a screen reader announced while walking the page.
 *
 * `phrases` is the raw, ordered log. `gaps` is the derived signal: positions
 * where the reader produced a bare role with no name, which is the exact
 * moment a blind user loses the thread.
 */
export interface Narration {
  /** Reader identity, so an announcement is never claimed as universal. */
  matrix: { reader: string; version: string; os: string };
  phrases: string[];
  /** Phrases that announce a role but no accessible name. */
  gaps: NarrationGap[];
}

export interface NarrationGap {
  /** Index into `phrases`. */
  at: number;
  /** The bare phrase, e.g. "image" or "button". */
  phrase: string;
  /** Role the reader announced. */
  role: string;
  /** What the user hears instead of a name, in plain words. */
  hears: string;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Score {
  /** 0-100. Higher is better. */
  value: number;
  grade: Grade;
  /** Findings that stop a user from completing a task. */
  blocking: number;
  byImpact: Record<AxeImpact, number>;
}

/** An ordered, copy-pasteable instruction set for an AI builder. */
export interface FixPrompt {
  /** Full text to paste into Lovable / Cursor / v0 / Claude. */
  text: string;
  /** One entry per fix, in application order. */
  steps: FixStep[];
}

export interface FixStep {
  order: number;
  /** The file/component the fix most likely lives in, inferred from selectors. */
  target: string;
  /** What to change. */
  instruction: string;
  /** Verbatim snippet the builder must produce. */
  snippet?: string;
  /** The announcement the reader must produce after the fix. */
  acceptance: string;
}

export interface ScanResult {
  id: string;
  url: string;
  finalUrl: string;
  title: string;
  scannedAt: string;
  /** Wall-clock duration in ms. */
  durationMs: number;
  score: Score;
  findings: Finding[];
  narration: Narration;
  /** Page-level signals that are not axe rules but matter to a buyer. */
  signals: PageSignals;
  fixPrompt: FixPrompt;
  /** Honest statement of what this scan cannot see. */
  limits: string[];
}

export interface PageSignals {
  lang: string | null;
  viewport: string | null;
  headingOutline: { level: number; text: string }[];
  interactiveCount: number;
  /** Ratio of interactive elements that expose an accessible name. */
  namedRatio: number;
  imagesWithoutAlt: number;
  formsWithoutLabels: number;
  /** Fields that pass axe only because a placeholder is doing the labelling. */
  placeholderOnlyLabels: number;
  hasSkipLink: boolean;
  documentTitle: string | null;
}

export interface ScanJob {
  id: string;
  url: string;
  status: 'queued' | 'running' | 'done' | 'error';
  createdAt: string;
  error?: string;
  result?: ScanResult;
}
