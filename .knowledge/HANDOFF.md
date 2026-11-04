# HANDOFF — Preflight

**For the next agent or session picking this up.** Read this first, then
`.knowledge/STATUS.md`.

## Where it stands

Version 0.1.0, working end to end on the Mac Mini, not deployed. A scan takes
about 2 seconds and produces a full report; the report page renders score,
transcript, findings, fix prompt, signals and limits. Both of the product's own
pages score A when scanned by the shipped engine.

## Start it

```bash
cd projects/preflight
npm install          # if node_modules is missing
npm run build
npm run start        # http://localhost:4317
```

`npm run dev` also works, but the first scan is slower while Next compiles.

The server needs a Chrome binary. `PREFLIGHT_CHANNEL=chrome` is the default; on a
machine without system Chrome, run `npx playwright install chromium` and set
`PREFLIGHT_CHANNEL=chromium`.

## Verify before you touch anything

```bash
npx tsc --noEmit                 # must be silent
npm test                         # 8/8
npx tsx scripts/cli.ts https://example.com
npx tsx scripts/cli.ts http://localhost:4317/ --allow-private   # own page, must be A
```

If the last command is below 100, the page regressed. Fix it before adding
features — the product sells accessibility and cannot ship an inaccessible report.

## The three files that matter

| File | Why |
|---|---|
| `src/lib/rules.ts` | The catalog. This is the product's voice; changes here change what customers read. |
| `src/lib/fix-prompt.ts` | The prompt builder. Its output is pasted into Lovable/Cursor; keep it terse and ordered. |
| `src/lib/scan.ts` | The pipeline. Any new signal goes here, not into a page component. |

## Do not do this

- Do not add an auth system "for later". Quota by IP is honest for v0.1.
- Do not make the score greener. Blocking issues must stay visible.
- Do not hide `limits[]` behind a tooltip or a modal.
- Do not deploy to a serverless platform without solving the browser problem
  first: Playwright needs a persistent Chromium and a longer timeout than most
  function platforms allow.

## The open decision

Deployment target. Three candidates, none chosen:

1. **Vercel** — easiest, but the scan route needs a browser and may exceed the
   function limit. Would need a separate scan service.
2. **Fly.io / Railway with a container** — Chromium installs cleanly, one
   process, no timeout surprise. Most likely answer.
3. **The Mac Mini behind a tunnel** — free, already running, but it is also the
   machine that runs the gateway. Do not risk it.

Recommendation: container on Fly, with the scan route as its own process so a
hung page never blocks the marketing page.

## Next experiment

Paste three generated fix prompts into Lovable, Cursor and v0. Count how many
findings actually close. Until that number exists, no feature here is justified.
