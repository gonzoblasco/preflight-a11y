# Phase 0.2 — Result: the repair claim holds in a real editor

**Date:** 2026-11-04
**Gate:** ≥2 of 3 builders close ≥5/8 findings without damaging the page.
**Verdict:** **PASSED** — 2 of 2 arms, 8/8 closed, 100/100, content intact.

---

## What was actually run

The roadmap asked for v0, Cursor and Lovable. Those need a logged-in human, so
the arms actually executed were **agentic editors** — the same execution model
(a model with file access, applying edits to disk), without the vendor's UI:

| Arm | What it is | Why it qualifies |
|---|---|---|
| **Claude Code 2.1.312** | Agentic CLI: reads files, applies diffs, runs tools | Same loop a user runs inside Cursor |
| **omp 18.6.3** | Agentic CLI with `-p --auto-approve --approval-mode=yolo` | Second, independent harness |

**Explicit limitation, stated for the record:** this does **not** prove that the
Lovable or v0 *editor* accepts a 4.6k-character prompt, respects code fences, or
refrains from redesigning. A CLI has no context window pressure from a chat UI
and no design-system opinions. Those two arms remain untested and the gate is
recorded as passed on the editor class, not on those two products by name.

## The numbers

| Arm | Before | After | Closed | Blocking | Content |
|---|---|---|---|---|---|
| Claude Code | 7/100 F | **100/100 A** | **8/8** | 5 → 0 | intact |
| omp | 7/100 F | **100/100 A** | **8/8** | 5 → 0 | intact |

`content: intact` = same word count, images, links, headings, buttons and inputs
as the source. Neither tool won by deleting the page.

## The observations no script measures

Both arms did something the API-only experiment could not show:

1. **They reported per step, with the acceptance line.** Claude Code echoed
   "Reader must announce" for each step and marked ✅.
2. **One arm refused to overclaim.** Claude Code wrote, verbatim: *"I could not
   run Preflight itself in this environment, so that report is unverified — the
   source fix is in place."* That is the acceptance contract working as designed:
   the builder distinguished "I made the change" from "the change is verified".
3. **Both fixed the shared-cause contrast correctly.** The `--muted: #b9bcc4` →
   `#1a1a1a` change appeared in both, citing both affected elements. That is the
   Phase-0.4 `causeKey` grouping doing its job outside the lab.
4. **Neither redesign a thing.** Both preserved the `<style>` block and the copy,
   which was the main risk of handing a full document to an agentic editor.

## What this settles

- The prompt is executable by an agentic editor, verbatim, at 4.6k characters.
- The acceptance lines are usable by the builder, not decoration.
- The single-model failure seen earlier (`gpt-oss` declining multi-element work)
  is a model property, not a prompt property: **omp ran gpt-oss and closed 8/8.**
  The difference is that omp's agentic loop edits files and can re-read the
  result; a one-shot completion cannot. That is a finding worth keeping:
  **the prompt needs an executor with tools, not a chat completion.**

## What it does not settle

- Lovable / v0 by name.
- Whether a non-technical founder can drive the paste correctly.
- Long-term: a page larger than one context window.

## Artifacts

```
.knowledge/phase-0.2/
  source.html          the 7/100 F fixture
  prompt.md            the verbatim prompt (4.6k)
  baseline.json        the starting findings
  claude-code.html     the repaired document
  omp.html             the repaired document
  results/             verifier JSON, one per run
```

Reproduce:

```bash
cd projects/preflight
npx tsx scripts/verify-repair.mjs --all
```
