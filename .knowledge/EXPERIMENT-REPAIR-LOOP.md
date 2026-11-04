# The repair loop: does the fix prompt actually fix anything?

**Date:** 2026-11-04
**Question:** the product's whole claim is "paste this into your AI builder and it
repairs the page". Is that true?

**Short answer:** yes, and better than expected — with one honest caveat about
what exactly was measured.

---

## Method

The claim cannot be tested on paper, and it cannot be tested by asking the model
whether it succeeded. It was tested by **closing the loop with the same engine
that produced the prompt**:

```
fixture  ──scan──►  findings + fix prompt
                        │
                        ▼
                   code model
                        │
                        ▼
              repaired HTML  ──scan──►  findings again
                                             │
                          closed / still open / newly introduced
```

- **Fixture:** `test/fixtures/ai-generated.html`, a landing page written in the
  shape AI builders produce: nav with an unlabelled logo image, three `<div>`s
  styled as cards with no heading level order, a `<ul>` made of `<div>`s, a
  form field with only a placeholder, no `<html lang>`, zoom disabled in the
  viewport meta, and no landmark structure.
- **Baseline scan:** **7/100 F**, 8 findings, 5 blocking.
- **Prompt:** the generated `fixPrompt.text`, verbatim. Not tuned, not shortened,
  not hand-ordered.
- **Models:** `gpt-oss:120b-cloud`, `deepseek-v4.1-flash:cloud`,
  `kimi-k2.7-code:cloud` — three different families, all served by Ollama.
- **Re-scan:** the returned HTML is served from a local `node:http` server and
  scanned by the same `scanPage` used in production.

### Why a model API and not the Lovable/v0 UI

Lovable and v0 are behind logins, and their editors are not scriptable. Using the
UI would have produced a story, not a number. Sending the same prompt to a code
model measures the part being sold — *can a builder execute this prompt* — and
produces an artifact that can be re-scanned, diffed and reproduced by anyone.
The limitation is stated, not hidden: this does not prove the Lovable editor
handles the same prompt identically.

### Guarding against a false success

A model can "close" a finding by deleting the thing that failed. Every repair was
therefore checked for content preservation before being believed:

| Artifact | Images | Links | Text words |
|---|---|---|---|
| Source fixture | 2 | 5 | 248 |
| gpt-oss repair | 2 | 5 | 248 |
| deepseek repair | 2 | 5 | 264 |
| kimi repair | 2 | 5 | 270 |

Nothing was removed. The findings closed because the markup was corrected.

---

## Results — after three prompt iterations

The first pass measured 87.5% closure and exposed three defects **in the prompt
itself**. Each was fixed and the experiment re-run. This is the final state:

| Model | Score after | Closed | Still open | New | Runs |
|---|---|---|---|---|---|
| `deepseek-v4.1-flash:cloud` | **100/100 A** | **8/8** | 0 | 0 | 2 |
| `kimi-k2.7-code:cloud` | **100/100 A** | **8/8** | 0 | 0 | 1 |
| `gpt-oss:120b-cloud` | 91/100 B | 7/8 | `color-contrast` | 0 | **3 (stable)** |

**Mean: 97/100, 95.8% of findings closed, 0 regressions introduced in any run.**

### The three iterations, and what each one proved

| # | Defect found in the prompt | Fix | Effect |
|---|---|---|---|
| 1 | `image-alt` read as "the image at this selector" | Instruction now says **EVERY image** | kimi 73 → 91 |
| 2 | Steps were deduped **per rule**, so two failing elements became one step | One step per element, except collective rules | contrast coverage |
| 3 | Two elements failing from one CSS variable were reported as two unrelated repairs | Grouped by measured cause + "fix the shared source, not each element" | kimi 91 → **100** |

Iteration 3 is the important one. The failing paragraph and the failing footer
span were both `--muted: #b9bcc4` on white. The prompt used to say "fix this
element" twice; the model fixed the visible one and left the rule open. Once the
prompt said *"Affects 2 elements that share this cause. Fix the shared source"*,
the model changed the variable and the rule closed.

### What still fails, and why it is the model and not the prompt

`gpt-oss:120b-cloud` failed `color-contrast` in **three consecutive runs** — not
variance. Inspection of its output shows it never touched `--muted` and never
touched the `footer` rule: it edited the hero paragraph's colour and stopped.

The prompt by then contained the measured ratio (1.89:1), both hex values, the
two affected selectors and the instruction to fix the shared source. Two other
model families closed it from that same text. So this is one model declining a
multi-element instruction, which is exactly the kind of thing a buyer should be
told: **the fix prompt is not model-agnostic, and the report should eventually
say which builders it was validated against.**

## Method note: the first pass was wrong and that is the finding

The experiment was started to confirm a claim, and instead it corrected the
product three times. The 87.5% figure in the first run was not the product
working at 87.5% — it was the prompt missing three things a real builder needed.
Without re-scanning the model's own output, none of that would have been visible:
every model would have *reported* success.

## What this changes in the product

1. **The claim is now backed.** "Paste this into your builder" is measured at
   87.5% closure with zero regressions across three model families.
2. **The fix prompt should inline computed contrast values.** `color-contrast`
   is the one class of defect a markup-only editor cannot resolve. Adding the
   failing element's resolved foreground/background to the prompt turns it from
   an instruction into a fact.
3. **Steps should be scoped collectively when the rule is collective.**
   `image-alt` is "every image without alt", not "the image at selector X".
4. **The README's honest-limits section stays.** One of eight rules resisted
   three capable models; that is exactly the kind of thing a buyer deserves to
   know before paying.

## Reproduce it

```bash
cd projects/preflight
npx tsx scripts/experiment.mjs deepseek-v4.1-flash:cloud
npx tsx scripts/experiment.mjs gpt-oss:120b-cloud
```

Reports land in `experiments/result-<model>.json`; the repaired documents land
next to them and can be diffed by hand.
