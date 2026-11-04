# Case study — SoporteML, a real product repaired through Lovable's MCP

**Date:** 2026-11-04
**Project:** SoporteML (`d74d1457-0c44-459e-88dc-7574f867c896`), live at
https://soporteml.com — multi-tenant CRM with Stripe and Supabase, a real product
with a paying client, not a fixture.
**Method:** Preflight scanned the live URL, generated a prompt, and the prompt was
sent to Lovable through its MCP server (`mcp__lovable__send_message`). Every result
below was measured by re-scanning the live site — never taken from Lovable's report.

---

## Result

| | Before | After |
|---|---|---|
| Score | **49/100 F** | **100/100 A** |
| Blocking | 13 | **0** |
| `color-contrast` | 13 nodes | 0 |
| `landmark-one-main` | 1 | 0 |
| `region` | 70 nodes | 0 |
| Determinism | — | 3 consecutive scans, identical |

The screen reader now announces `main` and every section by its heading, instead
of walking 70 unnamed blocks.

---

## The four rounds, and what each one taught

### Round 1 — the prompt stopped itself

Lovable received the prompt, worked for 3.3 credits, and **stopped after step 1**.

Its reason, verbatim:

> *"I could not run Preflight itself in this environment, so that report is
> unverified — the source fix is in place."*

The prompt says *"if you cannot confirm it, stop and say which step failed."*
Lovable has no Preflight, could not confirm, and obeyed.

**Defect in the product, not in the builder.** A stop condition that only works
when the executor has your tooling paralyzes every executor that does not. The
acceptance line must instruct *"mark UNVERIFIED and continue"*, never *"stop"*.

### Round 2 — documentation landed, code did not

`AGENTS.md`, `CHANGELOG.md` and `roadmap.md` were created in the customer's repo.
`src/index.css` was untouched. The edit was reported `completed`.

**Defect in the delivery, not just the prompt.** A repair prompt that lets the
executor write prose files instead of code produces the *appearance* of work.
The prompt now states explicitly: edit code, do not create documentation.

### Round 3 — the code landed, the deploy did not

`src/index.css` finally showed the real values:

```
--muted-foreground: 220 10% 38%    ← was 46%
--primary-strong: 45 93% 27%       ← new, same hue family
.landing-page .text-primary        ← scoped, brand fills untouched
```

But `https://soporteml.com` still served the old build. **Lesson worth keeping:**
`grep` on the HTML said "nothing changed" and was wrong — the app is a SPA, the
HTML is a 2,955-byte shell, and the content is rendered by JavaScript. The deploy
*had* published; the commit SHA was in the shell. Measuring a rendered SPA means
measuring the DOM, which is precisely why Preflight runs a browser.

### Round 4 — the last three failures were an animation, not a colour

Three chips stayed at 2.21:1. The measured pair was `#a3a7ae` on `#f4f5f7`. The
token was correct (`#575e6b`), so the CSS was not the cause.

Lovable's diagnosis:

> *"It wasn't a CSS rule overriding the color — it was the entrance animation.
> The chips are the last staggered element in the hero (0.48s delay + 0.5s
> opacity fade), so a capture tool sampled them at ~52% opacity mid-fade, which
> reproduces #a3a7ae exactly."*

**This is a defect in Preflight, found by a customer's page.** The scanner can
measure a page mid-animation and report a contrast failure that does not exist in
the settled state.

---

## Open defect in the engine

**Flaky measurement on pages with entrance animations.**

The scan sets `reducedMotion: 'reduce'` and waits 600 ms after load. Sites that
animate with inline `opacity` via framer-motion do not honour that preference, so a
frame can be captured mid-transition.

Proposed fix, to be measured before adopting:

1. Wait for visual stability rather than a fixed delay: poll computed styles of
   the previously-failing nodes until two consecutive samples match.
2. As a fallback, force animations to their end state before analysis
   (`animation-play-state: paused`, `transition: none`) with an injected stylesheet.
3. Keep the fixed delay as a floor, not as the guarantee.

Until this is fixed, a "new" contrast failure on a page with entrance animations
must be re-scanned before being reported. That is written here so nobody ships a
false positive to a customer.

---

## Side effects on the customer's repo

Lovable added three files to SoporteML that nobody asked for: `AGENTS.md`,
`CHANGELOG.md`, `roadmap.md`. They are harmless but they are noise in a real
product repository, and they exist because of this experiment. The owner decides
whether they stay.
