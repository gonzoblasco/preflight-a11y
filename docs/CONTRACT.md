# Data contract — what the UI receives

`ScanResult` is produced by `src/lib/scan.ts` and stored verbatim in SQLite. The UI
never recomputes a score or a finding; it renders what the engine observed.

```ts
interface ScanResult {
  id: string;                 // uuid
  url: string;                // what the user typed
  finalUrl: string;           // after redirects
  title: string;
  scannedAt: string;          // ISO
  durationMs: number;
  score: {
    value: number;            // 0-100
    grade: 'A'|'B'|'C'|'D'|'F';
    blocking: number;         // findings that stop a task
    byImpact: { critical: number; serious: number; moderate: number; minor: number };
  };
  findings: Finding[];        // sorted by impact, worst first
  narration: {
    matrix: { reader: string; version: string; os: string };
    phrases: string[];        // ordered, exactly what the reader spoke
    gaps: { at: number; phrase: string; role: string; hears: string }[];
  };
  signals: {
    lang: string | null;
    viewport: string | null;
    headingOutline: { level: number; text: string }[];
    interactiveCount: number;
    namedRatio: number;        // 0-1
    imagesWithoutAlt: number;
    formsWithoutLabels: number;
    placeholderOnlyLabels: number;
    hasSkipLink: boolean;
    documentTitle: string | null;
  };
  fixPrompt: {
    text: string;             // full copy-paste block
    steps: {
      order: number;
      target: string;
      instruction: string;
      snippet?: string;
      acceptance: string;     // "After the fix, the reader announces …"
    }[];
  };
  limits: string[];           // honest scope statements
}

interface Finding {
  id: string;                 // axe rule id, e.g. "image-alt"
  impact: 'minor'|'moderate'|'serious'|'critical';
  title: string;
  plainLanguage: string;
  wcag: string[];             // e.g. ["1.1.1"]
  nodes: { selector: string; html: string; failureSummary?: string }[];
  livedExperience: string | null;
  remediation: string;
}
```

## Non-negotiables for the UI

1. **Never show a green state next to a blocking finding.** Contradiction destroys trust.
2. **The narration is the hero.** Show the spoken phrases as a transcript, in order,
   and mark gaps inline. It is the only thing on the page a competitor cannot screenshot.
3. **`limits[]` is rendered in full.** Not in a modal, not behind a tooltip.
4. **The fix prompt is one click to copy** and shown verbatim (monospace, selectable).
5. **Accessibility of the report itself is the sales pitch.** If the report fails axe,
   the product is a joke. Semantic headings, real landmarks, visible focus, no div-buttons.
