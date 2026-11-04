# AGENTS.md — Preflight

Instructions for any agent working in this repository.

## What this is

A pre-launch accessibility gate for AI-generated websites. It renders a page,
checks it against axe-core, reads it with a screen reader, and emits a fix prompt
that an AI builder can execute.

Read `.knowledge/BRIEF.md` before changing product behaviour, and
`.knowledge/STATUS.md` before claiming anything works.

## Layout

```
src/lib/      the engine. No React, no Next imports, no DOM side effects.
src/app/      Next.js App Router: pages and API routes.
src/components/  client components only.
scripts/cli.ts   the distribution channel (npx preflight <url>).
test/         vitest; engine only, served from a local http fixture.
docs/CONTRACT.md   the data shape the UI renders.
```

## Rules

1. **The engine never imports React or Next.** It must stay runnable from a CLI
   and from a test with no framework present. If a change needs a hook, it
   belongs in `src/app/` or `src/components/`.
2. **A finding without plain language is a bug.** Every rule reaching the report
   must have an entry in `src/lib/rules.ts` or take the explicit fallback. Never
   let a rule render with an empty explanation.
3. **Never claim a page is compliant.** The report must keep `limits[]`. Removing
   or hiding it is a product regression, not a design choice.
4. **Every fix step ends with an acceptance announcement.** A step without
   `acceptance` cannot be verified by the builder and must not ship.
5. **The report must pass its own scan.** Before any release, run
   `npx tsx scripts/cli.ts <own-url> --allow-private` and keep it at grade A.
6. **Scores cannot be green while `blocking > 0`.** `score.ts` enforces this;
   do not add a UI exception.
7. **Security:** any new route that takes a URL must call `guardUrl`. Any new
   long-running endpoint must call `checkQuota`. There is no exception for
   "internal" routes.

## Commands

```bash
npm run dev        # http://localhost:4317
npm test           # engine tests (needs system Chrome or a playwright install)
npx tsc --noEmit
npm run build
npx biome check
npx tsx scripts/cli.ts example.com
```

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess`. Index access returns
  `T | undefined`; handle it instead of casting.
- No `any`, no `@ts-ignore`, no non-null assertion on parsed external data.
- Imports are extensionless inside `src/` (Next resolves them); the CLI imports
  from `../src/lib/...` the same way.
- CSS is hand-written in `src/app/globals.css` with custom properties. No
  framework, no CSS-in-JS.
- All user-facing copy is English. All code comments are English.

## Language

Public surface (this file, README, code comments, commits) is English. It is a
portfolio repository.
