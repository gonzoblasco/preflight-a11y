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

The only experiment that matters: paste three generated fix prompts into real AI
builders and measure how many findings actually close. Everything else is
polish on an unvalidated loop.
