# ARCHITECTURE — one engine, every surface

**Decision date:** 2026-11-04
**Status:** accepted (governs how the product is shaped from 0.3 onward)

---

## The statement

Preflight is **not** a web page, **not** an MCP server, and **not** an evaluation
service. It is **one engine with several delivery surfaces**, and the surfaces are
not alternatives — every one of them ships.

```
                        ┌──────────────────────────────┐
                        │      THE ENGINE (pure)       │
                        │  scan → findings → narration │
                        │      → score → fix prompt    │
                        └──────────────┬───────────────┘
                                       │
   ┌───────────┬───────────┬───────────┼───────────┬───────────┬──────────┐
   │           │           │           │           │           │          │
  CLI      GitHub      Web app      MCP local   MCP remote   REST API   Embed
 npx      Action     report+landing  stdio      HTTP         v1        badge
   │           │           │           │           │           │          │
 devs     PR gate     founders     Claude Code  Lovable/v0   partners   docs
 CI gate  every push  shareable    Cursor       agents       products   README
```

## Why this is possible, not aspirational

Verified by inspection, not by hope:

```bash
grep -rn "from 'react'\|from 'next" src/lib/*.ts
# → no matches
```

The engine's entire dependency set is: `playwright`, `axe-core`,
`@guidepup/virtual-screen-reader`, `jsdom`, `@modelcontextprotocol/sdk`, `zod`,
and Node builtins. **No UI framework, no server framework, no database engine
beyond `node:sqlite`.**

That is what makes a CLI, a CI action, a report page, a local MCP server, a
remote MCP server and a REST API all reachable from the same code. The moment a
React import lands in `src/lib/`, this document is void — and AGENTS.md rule 1
already forbids it.

## The surfaces, and what each one is for

| Surface | Who it serves | What it is for | State |
|---|---|---|---|
| **CLI** `npx preflight <url>` | developers | scan from the terminal, gate a build with a threshold | **built** |
| **GitHub Action** | teams | block a PR that ships a blocking defect | **built** (`action.yml`) |
| **Web app** | founders, agencies | a report a non-developer can read and forward | **built** (local) |
| **MCP local** (stdio) | Claude Code, OpenClaw | the gate inside a local agent loop | **built, tested** |
| **MCP remote** (HTTP) | Lovable, v0, Cursor | the gate inside a builder's loop | **built, untested remotely** |
| **REST API** | partners, other products | programmatic scans with a key | **partial** (`/api/scan`, `/api/report/:id`) |
| **Embeddable badge** | docs, READMEs | a live score that proves the claim | **not started** |

Six of seven are already reachable. The seventh is a small addition, not a
redesign.

## The rule that keeps this true

**The engine owns truth; surfaces own presentation.**

- A score is computed once, in `score.ts`. No surface recomputes it.
- A finding's plain language lives in `rules.ts`. No surface invents copy.
- The narration matrix travels with every observation, including through MCP.
- The `limits[]` array is rendered in full on every surface. A CLI that omits
  them is a bug, not a simplification.

This is the ADR-100 rule applied to a product: one datum, one owner.

## What "all of it" does NOT mean

Naming the boundary is as important as naming the ambition.

| Not this | Why |
|---|---|
| **A hosted SaaS that only works online** | The CLI and local MCP must work with no account. A developer evaluating a tool will not sign up to try it. |
| **A free public scanner** | Each scan drives a real browser. Unmetered public compute is a bill, not a product. The remote surfaces are metered; the local ones are free because they use the user's machine. |
| **An evaluation service for third parties** | Preflight measures a page, it does not certify a company's accessibility. No compliance claims, ever. |
| **A walled garden per surface** | The engine is MIT and the CLI is the proof. The paid value is the remote compute and the report, not the algorithm. |

## The business model that falls out of this

The surfaces make the pricing obvious, because cost and value differ per surface:

| Surface | Free | Paid |
|---|---|---|
| CLI + local MCP | unlimited — it runs on the user's CPU | — |
| GitHub Action | unlimited on public repos | — |
| Web report | 8 scans/day, no account | Pro: unlimited + history |
| **Remote MCP** | N scans/month per token | metered by plan — it is *our* compute |
| REST API | — | per-key quota |
| Agency | — | 25 client reports, branded |

**The asymmetry is the strategy:** local is free because it costs us nothing, and
that is what makes the CLI spread. Remote is metered because every call is a
browser on our machine. Same engine, different economics per surface.

## Consequence for the roadmap

The roadmap stops being a linear sequence of one surface at a time. From 0.3
onward, every phase must name **which surfaces it unlocks** and must not break
the others.

The gate for any change: **does the CLI still work with no account, and does the
remote MCP still answer in under 10s?** One without the other means the surfaces
have diverged.
