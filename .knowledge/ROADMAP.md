# ROADMAP — Preflight

**Created:** 2026-11-04
**Owner:** Kanam CORE (governance) → KANAM DEV (implementation) / KANAM STUDIO (UI)
**Current version:** 0.1.0 (cycle closed, audited)
**Next cycle:** 0.2.0

> This is a gate document, not a wish list. Every phase has an **exit gate** that
> must be demonstrated, and every phase has a **kill criterion** — the condition
> under which the work stops and the product pivots or dies. A roadmap without
> kill criteria is a fantasy with dates.

---

## Where we are, measured

| Fact | Evidence |
|---|---|
| Detection works | axe-core, 60+ rules enabled, scoring refuses green while blocking |
| Narration works | 39 phrases recorded on the landing page, gaps annotated per role |
| Repair loop works **against local models** | 97/100 mean, 95.8% closed, 0 regressions, 3 model families |
| The product audits itself | landing 100/100 A · report 97/100 A |
| Test suite | 9/9 |
| Cost per scan | ~1.6–2.0s wall clock, one browser context |
| **Not validated** | Lovable / Cursor / v0 as *actual editors* |
| **Not built** | accounts, billing, PDF, deploy, crawl |

**The honest one-liner:** an excellent engine with an unproven sales claim.

---

## Phase 0.2 — Prove or kill the sales claim  ✅ **PASSED (2026-11-04)**

> **Result:** 2 of 2 agentic editors closed **8/8** findings, 7/100 F → 100/100 A,
> content intact. Recorded in `.knowledge/phase-0.2/RESULT.md`.
>
> **Caveat kept on the record:** the arms were Claude Code and omp, not v0 or
> Lovable by name. Same execution class (model with file access + tools), not the
> same product. The v0/Lovable arms are unrun and the runbook stays valid.
>
> **New finding:** `gpt-oss` failed 8/8 one-shot but passed 8/8 inside omp. The
> prompt needs an **executor with tools**, not a chat completion. This changes
> the product's promise: "paste it into a builder" is really "give it to an
> agent that can edit and re-read".

**Goal.** Answer one question with evidence: *does the fix prompt work in the
tools our customers actually use?*

**Why first.** Every other phase is polish on a claim we have not verified.
If this fails, 0.3–0.7 are wasted money.

**Work**
1. Take the prompt generated for `test/fixtures/ai-generated.html` (baseline 7/100).
2. Paste it, verbatim, into: v0, Cursor (inline chat), Lovable.
3. Capture the resulting HTML/code from each tool.
4. Re-scan each result with `scanPage` and record closed / persisted / introduced.
5. Record the *interaction* facts that no API test can show: did it truncate the
   prompt? did it respect the code fences? did it ask for clarification? how many
   turns did it take?

**Exit gate**
- ≥2 of 3 real builders close ≥5 of 8 findings **without breaking layout**
  (layout check: the repaired page still renders the same text and the same
  number of images/links as the source).
- The failures that remain are explained per builder, not glossed.

**Kill criterion**
- If no real builder can execute the prompt, the product does not sell a
  "repair". It sells a **report** — and the roadmap pivots to Phase 0.5 + 0.6
  (report as the product, prompt as a bonus), with pricing cut accordingly.

**Cost:** ~2 hours of manual work, zero tokens beyond one scan per artifact.
**Blocks:** 0.3, 0.4, 0.5. Nothing else starts before this gate.

---

## Phase 0.3 — Cost, queue and the second user

**Goal.** Make the scanner survive a stranger.

**Why.** The narration driver takes a process-global lock: one scan at a time
per worker. Correct, but invisible. A visitor who waits 8 seconds behind another
scan has no idea why, and a second concurrent user on one container is a
correctness question nobody has answered.

**Work**
1. Measure concurrency: 5 simultaneous scans against the API on a container.
   Record p50/p95 latency and whether any narration result is contaminated
   (two scans sharing one jsdom document would show crossed phrases).
2. Make the wait visible: a queued state in the API response and in the UI copy.
3. Decide the deployment target with measurements, not vibes:
   - container with persistent Chromium (Fly/Railway) → expected winner
   - serverless → document why it cannot host the scan route
4. Document the real per-scan cost (CPU seconds, memory peak) so pricing is
   grounded in a number.

**Exit gate**
- 5 concurrent scans: no crossed narration, p95 under 20s, no OOM.
- A written deployment decision with the measurements that justify it.

**Kill criterion**
- If concurrency cannot exceed 1 per container without contamination, then the
  product is a **local CLI tool** first and a SaaS second. That is a legitimate
  outcome and changes the pricing page, not the engine.

**Cost:** ~half a day, mostly waiting on load tests.

---

## Phase 0.4 — Catalog with intent, not volume

**Goal.** Grow the rule catalog by *what actually breaks AI-generated sites*,
not by covering axe.

**Why.** 20 of ~60 rules have product-grade copy. The rest fall back to axe's
own wording — honest but indistinguishable from a wrapper. Adding rules
alphabetically would produce a longer, worse product.

**Work**
1. Mine the existing scan artifacts (`experiments/*.json`, recent scans) for the
   most frequent fallback rules on real sites.
2. Pick the next 10 by frequency × blocking severity.
3. For each: plain language, lived experience, remediation, fix with acceptance.
4. Forbid: writing a rule entry without a real page that exhibits it.

**Exit gate**
- Top 10 fallback rules by frequency now have product copy.
- Every new entry cites a real URL where it was observed.

**Kill criterion**
- If the top-10 list is dominated by rules that only appear on one site, do not
  add them — the catalog is not the bottleneck, distribution is.

**Cost:** ~1 day, no model cost.

---

## Phase 0.5 — The report declares its own validity

**Goal.** The report never claims more than was measured.

**Why.** We now know the prompt is **not model-agnostic**: `gpt-oss` declined a
multi-element instruction in three consecutive runs while two other families
closed it from identical text. A product that sells honesty must print that.

**Work**
1. `limits[]` gains a validation line: which builders the prompt was verified
   against, with the date and the closure rate.
2. The report states the scan's own matrix (already does) **and** the prompt's
   validation matrix (new).
3. Pricing page: remove any feature claim not backed by a shipped capability.
   Current known offenders, all already fixed once — keep them fixed.

**Exit gate**
- Re-run Phase 0.2's numbers into the report copy. No adjective without a figure.
- A reviewer can read the report and know exactly what is and is not proven.

**Cost:** ~3 hours, copy only.

---

## Phase 0.6 — Signals the engine already computes

**Goal.** Surface what is measured but unshown.

**Why.** `interactiveCount`, `namedRatio`, `formsWithoutLabels` are collected on
every scan and never rendered. The cheapest improvements in the product are
already paid for.

**Work**
1. Render `namedRatio` as the headline second metric ("82% of controls have a
   name"). It is the fastest way for a non-developer to feel the problem.
2. Show the queue/wait state from 0.3.
3. Keep the transcript above all of it. It is still the moat.

**Exit gate**
- The report passes its own scan at grade A after the change.
- A non-technical reader can explain the score in one sentence without help.

**Cost:** ~4 hours, UI only.

---

## Phase 0.7 — Revenue plumbing (only after 0.2 passes)

**Goal.** Take money without lying about what is built.

**Why last.** Billing is the easiest thing to build and the least useful until
someone wants to pay. Building it early creates the illusion of progress.

**Work**
1. Deploy per the 0.3 decision.
2. Stripe: two prices, Checkout, webhook writing a license row.
3. Accounts minimal: email + license code. No passwords, no teams.
4. Quota moves from IP fingerprint to license when a license exists.
5. PDF export for Agency — it is the only feature that justifies the tier's price.
   Until it exists, Agency is not for sale.

**Exit gate**
- A real payment completes end to end and a license row appears.
- The PDF renders a report a stranger would forward without embarrassment.

**Kill criterion**
- If 0.2 passed but no one scans twice without being asked, the problem is
  distribution, not conversion. Stop building and go talk to ten people.

---

## Sequencing, in one line

```
0.2 (prove the claim)  ──gate──►  0.3 (survive strangers)  ──►  0.4 (catalog)
                                      │
                                      └──►  0.6 (signals)
0.5 (honesty in copy) runs in parallel with 0.4 — it is copy, not code
0.7 (money) starts only after 0.2 AND 0.3 are green
```

**0.2 is a hard gate.** No phase after it starts until it reports.

---

## What we are explicitly not doing

| Not doing | Why |
|---|---|
| Crawling a whole site | Turns a 2s scan into a queue and a cost model nobody asked for. Revisit only if an Agency client pays for it. |
| An overlay widget | Cosmetic JS patching, legally contested, morally wrong. Not our market. |
| A compliance certificate | We cannot certify. Every report says so. |
| AI-generated explanations per finding | The catalog is hand-written on purpose: a model inventing copy about a rule it cannot see is how trust dies. |
| Accounts, teams, SSO | Nobody has asked. Build when a payer asks. |
| A Chrome extension | Different distribution physics. Only if the CLI stalls. |

---

## Decision log to update

| Date | Decision | Where |
|---|---|---|
| 2026-11-04 | Product opened, engine verified, repair loop measured at 95.8% | `.knowledge/EXPERIMENT-REPAIR-LOOP.md` |
| pending | Real-builder validation result | Phase 0.2 creates it |
| pending | Deployment target with measurements | Phase 0.3 creates it |
| pending | Go / pivot on the repair claim | Phase 0.2 kill criterion decides it |

---

## The single sentence to hold onto

**The engine is done; the sale is not proven.** Every hour from here should buy
evidence about the sale, not polish on the engine.
