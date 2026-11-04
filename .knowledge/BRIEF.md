# Preflight — product brief

**One line.** Your AI built the site. Preflight proves it works — and hands the builder the exact fix.

**Date opened:** 2026-11-04
**Owner:** Kanam CORE (governance), KANAM DEV (implementation), KANAM STUDIO (UI)
**Status:** cycle 0.1.0 — working end to end on macOS

---

## The bet

Accessibility detection is a commodity. axe-core is free and embedded in every
framework; Lighthouse ships in Chrome. A wrapper around it is worth nothing.

The unserved gap is the **repair handoff**. A founder who generated a site with
Lovable cannot read `color-contrast: Elements must meet minimum color contrast
ratio thresholds (1.4.3)`. They can, however, paste a prompt.

So the product owns the full arc:

```
render → detect → narrate (the experience) → explain in business language → emit a fix prompt
                                                            with acceptance criteria
```

The acceptance line is the differentiator no competitor has: after the fix, the
builder must produce a specific announcement. That turns a suggestion into a
verifiable contract, and it is directly inherited from `kanam-fixer`'s thesis
(assert the announcement, not the attribute).

## Who pays

| Segment | Pain | Why they pay |
|---|---|---|
| **Solo founders on Lovable / v0 / Bolt** | Shipping a site they cannot audit, with EU/ADA exposure and no a11y knowledge. | $29/mo is cheaper than one hour of an accessibility consultant. |
| **Small agencies** | Every client site needs a11y proof, and each audit eats a day of a senior. | $99/mo across 25 client sites with a white-label PDF is a billing line item. |
| **Dev teams using AI assistants** | Cursor/Claude write accessible-looking markup that fails in the reader. | CI gate on every PR; the fix prompt goes straight to the agent. |

The pricing is deliberately not usage-metered. Scanning is cheap (~2s of one
browser context); the value is the report, and per-scan billing would punish the
behaviour the product wants (scan constantly).

## Differentiation, stated bluntly

| Thing | Why it is not enough |
|---|---|
| axe / Lighthouse | Reports rule ids. Says nothing a non-developer can act on. |
| Overlay widgets (accessiBe etc.) | Cosmetic JS patching; widely criticised, legally contested. Do not compete, do not imitate. |
| Agency audits at $2–8k | Correct, slow, and unavailable to the person shipping tonight. |
| **Preflight** | Same detection, plus the transcript a person can feel and the prompt that repairs it. |

## Non-goals (explicitly out)

- Not a compliance certificate. Every report says so, in the report.
- Not a crawler. One URL per scan, by design: a crawl turns a 2s scan into a
  queue and a cost model nobody asked for.
- Not an overlay. We never touch the customer's page.
- No account system in v0.1. Quota by IP fingerprint, license by Stripe. Accounts
  arrive only when a paying customer asks for multi-seat.

## Monetization

| Plan | Price | Included | Margin logic |
|---|---|---|---|
| Free | $0 | 8 scans/day, full report, fix prompt | Acquisition. Cost ≈ $0 (local browser, SQLite). |
| Pro | $29/mo | Unlimited scans, shareable links, PDF export | One Stripe subscription covers ~2,000 scans of compute. |
| Agency | $99/mo | 25 client sites, white-label PDF, priority queue | Agencies bill this through; retention is high because the PDF is client-facing. |

Stripe is the provider (workspace decision, ADR-042). `api/checkout` degrades to a
501 with a mailto when keys are absent, so the pricing page is never a dead end.

## What must be true for this to win

1. **The transcript must move people.** If a founder reads "the reader says
   `image` and nothing else" and does not feel it, the product is a lint tool.
   → Validated in cycle 0.1: the dogfood scan of our own page surfaced
   `graphics-document` noise from decorative SVGs, which no rule id would have
   explained.
2. **The fix prompt must actually repair.** If pasting it into Lovable produces
   broken markup, the whole loop collapses. → Open question; needs 10 real
   pastes into 3 builders.
3. **The report must pass its own audit.** A tool that sells accessibility while
   shipping an inaccessible report is finished. → Own landing 100/100, own report
   97/100, both graded by the shipped engine.

## Open risks

| Risk | Mitigation |
|---|---|
| SSRF via arbitrary URL | Guard on literal host *and* after DNS; private ranges blocked; credentials rejected. |
| Abuse as free load testing | Burst 3/min + 8/day per fingerprint, persisted in SQLite. |
| AI builders blocking automation | Clear "the site refused the connection" error; documented limitation, not a silent failure. |
| Report shared as "we are WCAG compliant" | `limits[]` is rendered in full, in the report body, and again in the README. |
| One-model quality gap in the rules catalog | Catalog is hand-written and reviewed; unknown rules fall back to axe's own text rather than inventing copy. |

## Next cycle (0.2.0) — ordered by value

1. **Validate the loop.** Ten pastes into Lovable/Cursor/v0; measure how many
   findings actually close. This is the only experiment that matters.
2. **PDF export** for the Agency tier — it is the artifact an agency forwards.
3. **Multi-page crawl** behind the Agency tier only, with an explicit page cap.
4. **Real reader plane** (VoiceOver on macOS) as an opt-in local run, extending
   `kanam-fixer`'s driver contract into the product.
5. **Public OSS of the CLI**, keeping the SaaS private. The CLI is the
   distribution channel; the reports are the product.
