Context you must respect. This is a React + Vite + Tailwind (shadcn/ui tokens) project, NOT Next.js.

Apply fixes in the SOURCE COMPONENT (src/pages/Landing.tsx and src/index.css), not in built HTML.
Reuse existing Tailwind/shadcn tokens. Do not redesign, do not change copy, do not change layout.

Colour rules:
- The amber #e7b008 is a BRAND colour. Do not flatten it to near-black or grey. Keep the same hue and darken only enough to reach the ratio. State the exact hex you chose and the resulting ratio.
- Secondary text comes from the --muted-foreground token, not from individual classes. Adjust the token in src/index.css so every usage is fixed at once. It must pass on both the light background (#f4f5f7-ish) and the .dark background.
- Landmarks: wrap the page content in a single <main>. Keep the existing <nav> and <footer> outside it. Add an aria-label to each <section> that has a heading, so landmark navigation is meaningful.

When done, report per step: the file changed, the exact diff summary, and the resulting contrast ratio for every colour you touched.

You are fixing accessibility defects in a website you generated.
Work through the steps in order. Do not redesign anything; do not change copy unless a step says so.
After each step, confirm the "Reader must announce" line. If you cannot confirm it, stop and say which step failed.

Page: https://soporteml.com/
Current score: 49/100 (F). Blocking issues: 13.

## Step 1 — Elements must meet minimum color contrast ratio thresholds
Rule: color-contrast (serious) · WCAG 1.4.3
Where: the element at the selector below
Selector: .border-primary\/20
Current markup: <div class="inline-flex items-center gap-2 text-sm font-medium text-primary mb-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20" style="opacity: 1; transform: none;">
Do: Change the text or background colour of THIS rule, not the element's markup. Measured: measured ratio 1.73:1 (needs 4.5:1), foreground #e7b008, background #f5f0e1. Reach at least 4.5:1 for body text (3:1 for 24px+, or 19px+ bold), then verify.
Target markup:
```html
/* was #e7b008 on #f5f0e1 — pick a value of the same hue that reaches the target ratio */
```
Reader must announce: Re-run Preflight: the contrast rule reports no failing elements on this page.

## Step 2 — Document should have one main landmark
Rule: landmark-one-main (moderate) · WCAG 1.3.1
Where: the layout or page component wrapping this content
Selector: html
Current markup: <html lang="es" class="light" style="color-scheme: light;">
Do: Wrap the page content in one <main> element. Navigation and footer stay outside it.
Target markup:
```html
<main id="content">…</main>
```
Reader must announce: After the fix, the reader announces "main" as a landmark right after the header.

## Step 3 — All page content should be contained by landmarks
Rule: region (moderate) · WCAG 1.3.1
Where: the element at the selector below
Selector: .border-primary\/20
Current markup: <div class="inline-flex items-center gap-2 text-sm font-medium text-primary mb-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20" style="opacity: 1; transform: none;">
Do: Move this content inside <main> or another landmark, or wrap it in one.
Target markup:
```html
<main><section>…</section></main>
```
Reader must announce: After the fix, landmark navigation reaches the content.
