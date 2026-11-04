# ROADMAP — Preflight

**Created:** 2026-11-04
**Owner:** Kanam CORE (governance) → KANAM DEV (implementation) / KANAM STUDIO (UI)
**Current version:** 0.1.0 (cycle closed, audited)
**Next cycle:** 0.2.0

> **Product shape (2026-11-04):** one engine, every surface. CLI, GitHub Action,
> web report, local MCP, remote MCP, REST API and an embeddable badge are all
> first-class, all from the same framework-free engine. See
> `.knowledge/ARCHITECTURE.md`. A phase that unlocks one surface must not break
> another; the standing check is *"does the CLI still work with no account, and
> does the remote MCP still answer in under 10s?"*

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
| Test suite | 10/10 |
| Cost per scan | ~1.8–5.8s wall clock, one browser context |
| **Validated in a real builder** | ✅ Lovable, 49 F → 100 A on a live product (SoporteML) |
| **Still unvalidated** | v0 by name |
| **Built** | CLI, GitHub Action, web report, local MCP, remote MCP (stdio + HTTP) |
| **Not built** | accounts, billing, PDF export, deploy, embeddable badge |

**The honest one-liner:** a working engine with proven repair, delivered through
every local surface; what remains is hosting the remote one and charging for it.

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

## Phase 0.3 — Preflight as a remote MCP server

**Goal.** Not "deploy it". **Ship Preflight as a remote MCP server that a builder
can call**, so accessibility becomes a step in someone else's agent loop instead
of a page someone remembers to visit.

**Why this replaces the old 0.3.** The previous phase was deployment and
concurrency — infrastructure with no customer. The MCP channel *is* the customer,
and it imposes the same requirements (always up, bounded latency, safe under
concurrency) as a byproduct rather than as its own project.

### The channel, verified against Lovable's docs (2026-11-04)

| Fact | Value | Consequence |
|---|---|---|
| Plan required for custom MCP | **All plans** | No paywall on the channel itself. |
| Auth supported | OAuth, **bearer token**, or none | A token-per-customer model is viable from day one. |
| Reachability | Public URL | Needs a host with a persistent Chromium. |
| Static IPs | Enterprise only, for firewalled servers | **Not needed.** We are public. |
| **Read-only tools** | **Run with no approval card** | The whole design must be read-only tools. |
| Scope | **Personal**, never part of the published app | Distribution is per-user, not per-project. |
| Bulk discovery | **MCP registries** | The real distribution channel. |

**The last two lines are the strategy.** A connector is not viral through a
project; it is discovered through a registry. Publishing to the registries each
builder reads is worth more than ten integrations written by hand.

### Tools (all read-only — non-negotiable)

| Tool | Input | Returns | Why it exists |
|---|---|---|---|
| `scan_url` | `url` | score, grade, blocking count, findings (id, impact, plain language, lived experience) | The gate. What an agent calls when a build finishes. |
| `read_announcements` | `url` or `html` | the phrase log + gaps with plain-language readings | The moat, exposed as a tool. No competitor has this. |
| `assert_announcement` | `html`, expected phrases | pass/fail + what was actually announced | The `kanam-fixer` contract, reachable by any agent. |
| `get_fix_prompt` | `url` | the ordered prompt with acceptance lines | The repair handoff. |
| `explain_rule` | `rule id` | plain language, lived experience, remediation | Cheap, cacheable, makes the agent smarter mid-conversation. |

**No tool writes to the customer's project.** Preflight never edits the page —
that is a product decision that now doubles as the connector's security boundary.
Adding a write tool would require an approval card on every call and destroy the
"runs without asking" property that makes the integration useful.

### Built already (2026-11-04)

- `src/lib/mcp.ts` — five read-only tools with `readOnlyHint` annotations:
  `scan_url`, `read_announcements`, `assert_announcement`, `get_fix_prompt`,
  `explain_rule`.
- `src/lib/mcp-cli.ts` — one entry, two transports: `--stdio` and `--http`.
- Verified end to end through an in-memory MCP client: tools list with
  `ro=true`, `read_announcements` finds the nameless image and button,
  `scan_url` returns a real score, and the SSRF guard rejects loopback inside
  the tool call.

### Work

1. **Transport.** Done for HTTP (stateless, one transport per request). Verify it
   against a real remote client, not only the in-memory pair.
2. **Hosting.** Container with a persistent Chromium (Fly/Railway). Serverless is
   ruled out by the 60s cap and the browser requirement — decide with measurements.
3. **Auth.** Bearer token per customer, checked against the `licenses` table that
   already exists. `401` with a clear message when absent.
4. **Quota.** Per-token scans/month tied to the plan, replacing IP fingerprints.
   The current burst limiter stays as a second layer.
5. **Read-only marking.** Every tool must be flagged read-only in its MCP
   descriptor so Lovable skips the approval card. Verify this in the client, not
   in the docs.
6. **Latency budget.** p95 under 10s for `scan_url` on a typical landing page.
   A tool that blocks a build for 45s will be removed by the user.

### Exit gate

- A real Lovable chat calls `scan_url` against a preview URL and gets a score,
  **with no approval card**, in under 10s.
- The **REST API** exposes the same engine at `/api/v1/scan` with an API key, so
  partners are not forced through MCP.
- The **embeddable badge** (`/badge/<scan-id>.svg`) renders a live score for a
  README or docs page. Small, but it is the only surface that markets itself.
- `read_announcements` returns the same transcript the web report shows.
- A second concurrent call does not contaminate the first (the narration lock).
- Token auth rejects an unauthenticated call with a readable error.

### Kill criterion

- If p95 exceeds 20s on a container, the MCP channel is wrong for this product
  and it stays a web tool + CLI. A slow tool inside someone's build loop is worse
  than no tool.
- If read-only marking is ignored by the client and every call needs approval,
  the integration is dead on arrival regardless of quality.

### Cost

~2 days: 1 for transport + host, 1 for auth/quota and the read-only verification.

---

## Phase 0.3.1 — Fix the flaky measurement (found by a real customer)  ✅ **DONE (2026-11-04)**

> **Result:** entrance animations are frozen and visuals are sampled until stable.
> 10/10 tests, including a regression that **fails on the old 600 ms wait** and
> passes on the fix — verified both ways, not assumed.
> Real sites unchanged: SoporteML 100/100, example.com 82/100. `stripe.com` moved
> 51 → 54, because part of its "failures" were also mid-animation artefacts.

**Goal.** Stop reporting contrast failures that exist only mid-animation.

**Why it is urgent, not cosmetic.** The SoporteML run produced a false positive on
a paying product: three chips measured 2.21:1 because the scanner sampled them at
52% opacity during a framer-motion entrance fade. The settled value was 5.15:1.
A tool that cries wolf on a customer's live site loses the customer.

**Work**
1. Replace the fixed 600 ms wait with a stability wait: sample the computed style
   of the failing nodes until two consecutive reads match.
2. Inject a stylesheet that neutralises `animation` and `transition` before
   analysis, as a second line of defence.
3. Re-scan each finding once before reporting it. Never report a finding that
   disappears on the second read without labelling it as flaky.
4. Add a fixture with a staggered opacity animation so the regression is caught
   by the suite, not by a customer.

**Exit gate**
- The animation fixture reports zero contrast failures, three runs in a row.
- The `stripe.com` and `soporteml.com` scans are unchanged.
- A test asserts that a mid-fade element is not reported.

**Cost:** ~half a day. This precedes any new feature.

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

## Phase 0.7 — Revenue plumbing → **folded into Stage 3 / Phase 0.9**

Kept as a reference for the payment mechanics, not as a separate phase. Selling
before Stage 1 is green is the failure mode this ordering exists to prevent.

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

## Three stages, in order

The product is delivered in three stages, and **each stage must be finished before
the next one starts**. The reason is not caution: each later surface inherits its
credibility from the earlier one. A remote MCP that calls a flaky local engine is
worse than no MCP, and a paid dashboard on top of an unproven gate is a refund.

### Stage 1 — Local, perfect  ← **we are here**

> *"The tool a developer keeps because it never lies."*

Everything that runs on the user's machine, with no account, no network, no
billing. This is the stage that has to be **boringly reliable**, because it is the
only stage we can verify end to end without anything external depending on us.

| Surface | State | What "perfect" means |
|---|---|---|
| CLI | built | Any URL, any page size, deterministic score, honest error on every failure mode |
| GitHub Action | built | Fails a PR on a blocking defect, posts a readable summary |
| Local MCP (stdio) | built | Five read-only tools, works inside Claude Code / OpenClaw |
| Engine accuracy | 0.3.1 done | No false positives from animations; no missed blocking defect on the fixtures |

**Gate to leave Stage 1:** the CLI and local MCP run ten real sites in a row with
no crash, no timeout, and no finding that changes between two runs. A false
positive on a live site is a Stage 1 failure, not a Stage 2 one.

---

### Stage 2 — Remote MCP

> *"The gate inside someone else's build loop."*

Only starts when Stage 1 is stable. The remote surface adds what local cannot:
reachability from Lovable, v0 and Cursor without the user installing anything.

| Work | Why it belongs to this stage |
|---|---|
| Container with a persistent Chromium | Stage 1 proves the engine; this proves it *serves* |
| Bearer token + per-token quota | Remote compute is ours, so it is metered |
| Read-only verification in a real client | The approval-card property must be observed, not assumed |
| p95 under 10s on a typical landing page | A slow tool inside a build loop gets removed |

**Gate to leave Stage 2:** a real Lovable chat calls `scan_url` on a preview URL,
gets a score in under 10s, and shows no approval card.

---

### Stage 3 — The subscription product

> *"The place a team goes when accessibility becomes someone's job."*

This is the SaaS the product is built for, and it is deliberately last: it is the
stage where money changes hands, and selling before the gate is proven is how a
tool gets one star and no second customer.

**What the paid product contains, as stated by the owner (2026-11-04):**

| Piece | Free | Paid |
|---|---|---|
| CLI + GitHub Action | ✅ unlimited | — |
| Local MCP | ✅ unlimited | — |
| Scans, dashboard, history | 8/day, no account | unlimited + history |
| **Reports** | the report a scan produces | saved, branded, exportable PDF |
| **Accessibility resources** | — | a curated library: WCAG explained for the person who ships, patterns, checklists |
| **AI assistant for questions** | — | ask about a finding, a rule, a pattern; grounded in the same catalog the engine uses |
| Remote MCP | N scans/month per token | metered by plan |
| REST API | — | per-key quota |
| Agency | — | 25 client reports, white-label |

**The AI assistant is a Stage 3 feature on purpose.** It answers questions about
the catalog the engine already owns — it never invents a finding. That constraint
is what keeps it from becoming the thing that destroys trust in the product.

**Work**
1. Accounts: email + license code. No passwords, no teams, until a payer asks.
2. Stripe: Checkout, webhook, license row.
3. Dashboard: scan history, saved reports, PDF export.
4. Resources library: hand-written, one page per rule, cited to WCAG.
5. AI assistant: RAG over the rule catalog + resources, with citations and an
   explicit "I do not know" path.

**Gate to leave Stage 3:** a real payment completes, and a stranger forwards a PDF
without being asked to.

---

## Phase map

| Phase | Stage | State |
|---|---|---|
| 0.2 Claim proven in a real builder | — | ✅ PASSED |
| 0.3.1 Deterministic measurement | 1 | ✅ DONE |
| **0.3 Local surfaces hardened** | **1** | **in progress** |
| 0.4 Catalog with intent | 1 | pending |
| 0.5 Report declares its validity | 1 | pending |
| 0.6 Signals the engine computes | 1 | pending |
| **0.8 Remote MCP, hardened** | **2** | pending |
| **0.9 Subscription product** | **3** | pending |
| 0.7 Revenue plumbing | 3 | folded into 0.9 |

**0.2 is a hard gate.** No phase after it starts until it reports.
**Stage 1 must be green before Stage 2 starts.** The standing check never changes:
*does the CLI still work with no account?*

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
| Write tools in the MCP (fix the customer's code) | Breaks the read-only property that lets Lovable call us without an approval card, and makes us responsible for their code. |

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
