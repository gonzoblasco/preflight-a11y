You are fixing accessibility defects in a website you generated.
Work through the steps in order. Do not redesign anything; do not change copy unless a step says so.
After each step, confirm the "Reader must announce" line. If you cannot confirm it, stop and say which step failed.

Page: a landing page for "Kova" (single-file HTML, provided below)
Current score: 7/100 (F). Blocking issues: 5.

## Step 1 — Images must have alternative text
Rule: image-alt (critical) · WCAG 1.1.1
Where: the element at the selector below
Selector: img[src$="logo.svg"]
Current markup: <img src="/logo.svg">
Do: Add an alt attribute to EVERY image on the page, not only the one below. If an image conveys information, write what it communicates in one sentence. If it is purely decorative, use alt="" (empty) so assistive tech skips it.
Target markup:
```html
<img src="…" alt="Describe what the image shows" />  <!-- or alt="" if decorative -->
```
Reader must announce: After the fix, the screen reader announces "image, <your description>" instead of a bare "image".

## Step 2 — Elements must meet minimum color contrast ratio thresholds
Rule: color-contrast (serious) · WCAG 1.4.3
Where: the element at the selector below
Selector: .hero > p
Current markup: <p>Kova turns a sentence into a production-ready page. No design skills, no template hunting, no waiting on an agency.</p>
Affects 2 elements that share this cause. Fix the shared source (a CSS variable or rule), not each element separately:
  - .hero > p
  - span
Do: Change the text or background colour of THIS rule, not the element's markup. Measured: ratio 1.89:1 (needs 4.5:1), foreground #b9bcc4, background #ffffff. Reach at least 4.5:1 for body text (3:1 for 24px+, or 19px+ bold), then verify.
Target markup:
```html
color: #1a1a1a;      /* was #b9bcc4 on #ffffff */
```
Reader must announce: Re-run Preflight: the contrast rule reports no failing elements on this page.

## Step 3 — <html> element must have a lang attribute
Rule: html-has-lang (serious) · WCAG 3.1.1
Where: app/layout.tsx or index.html
Selector: html
Current markup: <html>
Do: Declare the page language on the root element.
Target markup:
```html
<html lang="en">
```
Reader must announce: After the fix, the reader switches to the declared language voice on load.

## Step 4 — <ul> and <ol> must only directly contain <li>, <script> or <template> elements
Rule: list (serious) · WCAG 1.3.1
Where: the <ul> elements
Selector: ul
Current markup: <ul> <div>Starter — $0</div> <div>Pro — $19/mo</div> <div>Team — $49/mo</div> </ul>
Do: Replace the styled divs with <ul> and <li>, keeping the classes.
Target markup:
```html
<ul class="space-y-2"><li>…</li></ul>
```
Reader must announce: After the fix, the reader announces "list, N items" before the items.

## Step 5 — Heading levels should only increase by one
Rule: heading-order (moderate) · WCAG 1.3.1
Where: the element at the selector below
Selector: body > h3
Current markup: <h3>Why teams choose Kova</h3>
Do: Change the heading level so the sequence increases by one. Keep the visual size with CSS.
Target markup:
```html
<h2 class="text-3xl">Section</h2>
```
Reader must announce: After the fix, the reader announces heading levels 1, 2, 3 in order with no gaps.

## Step 6 — Document should have one main landmark
Rule: landmark-one-main (moderate) · WCAG 1.3.1
Where: app/page.tsx
Selector: html
Current markup: <html>
Do: Wrap the page content in one <main> element. Navigation and footer stay outside it.
Target markup:
```html
<main id="content">…</main>
```
Reader must announce: After the fix, the reader announces "main" as a landmark right after the header.

## Step 7 — Zooming and scaling must not be disabled
Rule: meta-viewport (moderate) · WCAG 1.4.4
Where: app/layout.tsx or index.html
Selector: meta[name="viewport"]
Current markup: <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
Do: Allow zoom by removing maximum-scale and user-scalable=no.
Target markup:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
Reader must announce: Re-run Preflight: meta-viewport passes and pinch-zoom works.

## Step 8 — All page content should be contained by landmarks
Rule: region (moderate) · WCAG 1.3.1
Where: the element at the selector below
Selector: img[src$="logo.svg"]
Current markup: <img src="/logo.svg">
Do: Move this content inside <main> or another landmark, or wrap it in one.
Target markup:
```html
<main><section>…</section></main>
```
Reader must announce: After the fix, landmark navigation reaches the content.
