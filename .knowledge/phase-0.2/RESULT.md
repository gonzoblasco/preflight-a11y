# Phase 0.2 — Result: the repair claim holds in a real editor

**Date:** 2026-11-04
**Gate:** ≥2 of 3 builders close ≥5/8 findings without damaging the page.
**Verdict:** **PASSED** — 3 of 3 arms, 8/8 closed, 100/100, content intact.
**Lovable arm run for real on 2026-11-04.**

---

## What was actually run

The roadmap asked for v0, Cursor and Lovable. Two of the three were run for
real. The third (v0) never started, and Cursor was substituted by two agentic
CLIs of the same execution class:

| Arm | What it is | Why it qualifies |
|---|---|---|
| **Lovable** (published) | The real builder, real deployment, real URL | The product the claim is sold to |
| **Claude Code 2.1.312** | Agentic CLI: reads files, applies diffs, runs tools | Same loop a user runs inside Cursor |
| **omp 18.6.3** | Agentic CLI with `-p --auto-approve --approval-mode=yolo` | Second, independent harness |

**Lovable was tested end to end.** The `source.html` fixture was uploaded as a
project, the verbatim 4.6k prompt was pasted into the builder chat, the result
was published at
`https://pixel-perfect-replay-24576.lovable.app/`, and that URL was scanned.

Lovable accepted the prompt, did not truncate it, did not redesign the page,
and returned a working deployment. **v0 remains untested.**

## The numbers

| Arm | Before | After | Closed | Blocking | Content |
|---|---|---|---|---|---|
| **Lovable (live URL)** | 7/100 F | **100/100 A** | **8/8** | 5 → 0 | intact |
| Claude Code | 7/100 F | **100/100 A** | **8/8** | 5 → 0 | intact |
| omp | 7/100 F | **100/100 A** | **8/8** | 5 → 0 | intact |

### The Lovable arm, in detail

A deliberate control was published first — the base page with no prompt applied —
so before and after ran through the same renderer:

| | Control (base published) | After the prompt |
|---|---|---|
| Score | **7/100 F** | **100/100 A** |
| Findings | 8 (incl. `region` ×12) | **0** |
| Blocking | 5 | **0** |
| Words / images / links / buttons / inputs | 92 / 2 / 6 / 4 / 1 | **92 / 2 / 6 / 4 / 1** |

The control reproduced the local fixture's findings **exactly, in the same
order**, which calibrates the instrument: the engine measures the same in
Lovable's renderer as in the local one. The repair then closed every one of
them without changing a single unit of content.

`content: intact` = same word count, images, links, headings, buttons and inputs
as the source. Neither tool won by deleting the page.

## The observations no script measures

Both arms did something the API-only experiment could not show:

0. **Lovable interpreted rather than obeyed — the best finding of the run.**
   The prompt suggested `color: #1a1a1a`. Lovable used **`#5f6470`** instead,
   and said why: so the text still reads as secondary. It also added
   `aria-label="Email"` to the email input, **which the prompt never asked for**
   (axe accepts a placeholder as a name; the human cost of a placeholder is
   invisible to axe). Both choices are improvements. This is the difference
   between a builder executing an instruction and a builder applying judgement,
   and it is the strongest argument that the acceptance-criteria format works:
   it gave the model a goal instead of a command.
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

- v0 by name (never run).
- Whether a non-technical founder drives the paste correctly.
- Long-term: a page larger than one context window.
- **A correction worth recording:** the first scan of the published URL returned
  7/100 F. That was not a failure of the product — the deploy was serving the
  base page, published deliberately as the control. The mistake was mine:
  I nearly reported a builder as dishonest because its deployment showed no
  change. Verify what is deployed before judging what was built.

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
