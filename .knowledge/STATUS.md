# STATUS — Preflight

**Updated:** 2026-11-04
**Version:** 0.1.0
**State:** working end to end, locally verified, not deployed, not published.

---

## What works (verified, not assumed)

| Capability | Evidence |
|---|---|
| Scan a real public page | `POST /api/scan` on `https://example.com` → 82/100 C, 3 findings, 1.9s |
| Screen-reader transcript | 39 phrases recorded for the landing page, gaps marked with plain-language notes |
| Fix prompt with acceptance criteria | 12 steps generated, one per rule, each ending in "Reader must announce: …" |
| SSRF guard | Unit test: loopback, private ranges, IPv4-mapped IPv6, credentials, non-HTTP all rejected |
| Rate limiting | Burst 3/min + 8/day per sha256 fingerprint, persisted in `node:sqlite` |
| Self-audit | Own landing 100/100 A; own report page 97/100 A |
| Build | `next build` clean; `tsc --noEmit` clean |
| Tests | `vitest run` → 8/8 pass |
| CLI | `npx tsx scripts/cli.ts example.com` prints transcript + findings + prompt |
| **Real-world scan** | `stripe.com` → 51/100 D, 2 blocking; findings verified by hand against the DOM. No false positives. |
| **Bot-blocking handled** | `lovable.dev` returns 403; the scan fails with "The site returned HTTP 403. A public page is required." rather than a stack trace. |
| **Repair loop measured** | Three model families, re-scanned by the same engine: 97/100 mean, **95.8% of findings closed, 0 regressions**. See `.knowledge/EXPERIMENT-REPAIR-LOOP.md`. |

## What is deliberately not done

- **No deployment.** Runs on `localhost:4317`. Deploy target (Vercel vs Fly vs a
  VPS with a persistent Chrome) is undecided because serverless has a 60s cap and
  Playwright needs a real browser. That is a decision, not an oversight.
- **No Stripe keys wired.** `api/checkout` returns 501 with a mailto fallback.
  The pricing page works; the payment does not.
- **No accounts.** Quota is per IP fingerprint. Adequate until someone pays.
- **No PDF export.** Named in the Agency tier; not built. Say so before selling it.
- **No crawl.** One URL per scan.

## Known issues

| Issue | Severity | Note |
|---|---|---|
| `--allow-private` exists on the CLI only | low | Needed to dogfood localhost; the API never honours it. |
| Virtual reader is a proxy for real readers | medium | Documented in `limits[]` on every report and in the README. |
| The `rules.ts` catalog covers 20 rules | medium | Everything else falls back to axe's own wording — never invented, but thinner. |
| No visual regression test | low | UI is verified by screenshot review, not by assertion. |

## Next action

The repair loop is validated (95.8% closure, 0 regressions, three model families).
The next step is no longer "does it work" but "who pays": deploy the scan route
to a container with a persistent Chromium, wire Stripe, and put the CLI in front
of a developer who already ships with Cursor.

Open product gap found by measurement: **the prompt is not model-agnostic.**
`gpt-oss` declined a multi-element instruction three times while two other
families closed it from identical text. The report should state which builders
the prompt was verified against.
