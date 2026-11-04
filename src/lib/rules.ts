/**
 * The rule catalog.
 *
 * axe tells us *which* rule failed. This catalog is what turns that into a
 * product: what it costs the visitor, what the reader actually announced, and
 * what the builder must produce for the fix to count as done.
 *
 * Every entry has four jobs:
 *   1. `plainLanguage`  - for the founder who paid for the site, not the dev.
 *   2. `livedExperience` - the concrete moment a screen reader user is blocked.
 *   3. `remediation`     - imperative, one sentence.
 *   4. `fix()`           - an instruction + snippet + acceptance announcement.
 *
 * A rule absent from this catalog is still reported (never dropped), with a
 * generic template derived from axe's own description. Silence is worse than
 * a slightly thin explanation.
 */

export interface RuleCopy {
  plainLanguage: string;
  wcag: string[];
  livedExperience: string | null;
  remediation: string;
  /** Builds the actionable step for one failing node. */
  fix: (node: FixInput) => StepDraft;
}

export interface FixInput {
  selector: string;
  html: string;
  failureSummary?: string;
}

export interface StepDraft {
  target: string;
  instruction: string;
  snippet?: string;
  acceptance: string;
  /** Optional key identifying a shared cause, e.g. `contrast:#b9bcc4:#ffffff`. */
  causeKey?: string;
}

/** Truncates HTML for display without cutting an entity in half. */
export function clip(html: string, max = 160): string {
  const flat = html.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export const RULES: Record<string, RuleCopy> = {
  'image-alt': {
    plainLanguage:
      'An image carries information but has no text alternative, so it is invisible to anyone who cannot see it.',
    wcag: ['1.1.1'],
    livedExperience:
      'The reader says only "image" and moves on. The person has no idea whether it was a logo, a chart, or a decoration.',
    remediation:
      'Give every meaningful image an alt that states its content, and mark decorative ones as decorative.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Add an alt attribute to EVERY image on the page, not only the one below. If an image conveys information, write what it communicates in one sentence. If it is purely decorative, use alt="" (empty) so assistive tech skips it.',
      snippet: `<img src="…" alt="Describe what the image shows" />  <!-- or alt="" if decorative -->`,
      acceptance:
        'After the fix, the screen reader announces "image, <your description>" instead of a bare "image".',
    }),
  },
  'button-name': {
    plainLanguage:
      'A button has no readable text, so it cannot be identified or used without sight.',
    wcag: ['4.1.2'],
    livedExperience:
      'The reader says "button" and then waits. The user cannot tell whether it submits, closes, or deletes — and a wrong guess is expensive.',
    remediation:
      'Give each button a text label, or an aria-label when the visible label is an icon.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Add visible text, or an aria-label that names the action. Icon-only buttons must always have an aria-label.',
      snippet: `<button aria-label="Close dialog"><svg aria-hidden="true">…</svg></button>`,
      acceptance:
        'After the fix, the reader announces "button, <action name>" rather than "button".',
    }),
  },
  'link-name': {
    plainLanguage: 'A link has no readable text, so it cannot be followed by a screen reader user.',
    wcag: ['2.4.4', '4.1.2'],
    livedExperience:
      'The reader says "link" with no destination. The user must guess or skip the whole section.',
    remediation: 'Give each link text that describes where it goes.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Add link text that names the destination. If only an icon is visible, add an aria-label. Never use "click here".',
      snippet: `<a href="/pricing" aria-label="See pricing plans">→</a>`,
      acceptance: 'After the fix, the reader announces "link, <destination>".',
    }),
  },
  'color-contrast': {
    plainLanguage:
      'Text is too close in brightness to its background, so it is hard or impossible to read for people with low vision.',
    wcag: ['1.4.3'],
    livedExperience:
      'Nothing is announced differently — this one is silent. The user simply cannot read the words, and there is no workaround.',
    remediation:
      'Raise the text/background contrast to at least 4.5:1 for body text and 3:1 for large text.',
    fix: (n) => {
      // The measured values come from axe itself. An editor that only receives
      // markup cannot compute them, so the prompt states them as facts instead
      // of asking the builder to guess. This is the one rule class that
      // consistently resisted three capable models in the repair experiment.
      const measured = n.failureSummary ?? '';
      const ratio = measured.match(/contrast of ([\d.]+)/i)?.[1];
      const fg = measured.match(/foreground color: (#[0-9a-f]{3,8})/i)?.[1];
      const bg = measured.match(/background color: (#[0-9a-f]{3,8})/i)?.[1];
      const facts = [
        ratio ? `measured ratio ${ratio}:1 (needs 4.5:1)` : null,
        fg ? `foreground ${fg}` : null,
        bg ? `background ${bg}` : null,
      ].filter(Boolean);

      return {
        target: n.selector,
        instruction:
          "Change the text or background colour of THIS rule, not the element's markup. " +
          (facts.length ? `Measured: ${facts.join(', ')}. ` : '') +
          'Reach at least 4.5:1 for body text (3:1 for 24px+, or 19px+ bold), then verify.',
        snippet: fg && bg ? `color: #1a1a1a;      /* was ${fg} on ${bg} */` : undefined,
        acceptance: 'Re-run Preflight: the contrast rule reports no failing elements on this page.',
      };
    },
  },
  'document-title': {
    plainLanguage:
      'The page has no title, so browser tabs, history and screen readers cannot name it.',
    wcag: ['2.4.2'],
    livedExperience:
      'The reader opens the page and says "document" with no name. With several tabs open, every one of them is indistinguishable.',
    remediation: 'Add a unique, descriptive <title>.',
    fix: () => ({
      target: 'app/layout.tsx or index.html',
      instruction: 'Set a title that names the page and the site, in that order.',
      snippet: `<title>Pricing — Acme</title>`,
      acceptance: 'After the fix, the reader announces "Pricing — Acme, document" on load.',
    }),
  },
  'html-has-lang': {
    plainLanguage:
      'The page does not declare its language, so screen readers may pronounce everything with the wrong accent or voice.',
    wcag: ['3.1.1'],
    livedExperience:
      'A reader set to English reads Spanish content letter by letter, or the reverse. It is comprehensible only with effort.',
    remediation: 'Set the lang attribute on <html>.',
    fix: () => ({
      target: 'app/layout.tsx or index.html',
      instruction: 'Declare the page language on the root element.',
      snippet: `<html lang="en">`,
      acceptance: 'After the fix, the reader switches to the declared language voice on load.',
    }),
  },
  label: {
    plainLanguage: 'A form field has no label, so the user cannot know what to type in it.',
    wcag: ['1.3.1', '3.3.2', '4.1.2'],
    livedExperience:
      'The reader says "edit text" and nothing else. The user types a guess into a field that might be their email or their card number.',
    remediation:
      'Associate every input with a visible <label>, or an aria-label when the design hides it.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Add a <label for="…"> that names the field, or aria-label if the visible text lives elsewhere. Placeholders are not labels.',
      snippet: `<label for="email">Email</label>\n<input id="email" type="email" />`,
      acceptance:
        'After the fix, the reader announces "textbox, Email" when focus lands on the field.',
    }),
  },
  'page-has-heading-one': {
    plainLanguage:
      'The page has no top-level heading, so there is no single sentence telling a visitor what this page is.',
    wcag: ['1.3.1', '2.4.6'],
    livedExperience:
      'A user pressing the heading shortcut gets nothing, or starts at level 2 with no idea what came before. The page has no title in its outline.',
    remediation: 'Add exactly one h1 that names the page.',
    fix: () => ({
      target: 'app/page.tsx',
      instruction:
        'Add one <h1> that states what this page is. Other section titles become <h2>. Keep the visual size with CSS.',
      snippet: `<h1 class="text-5xl">Ship faster</h1>`,
      acceptance: 'After the fix, the reader announces "heading, <page title>, level 1".',
    }),
  },
  'heading-order': {
    plainLanguage:
      'Headings skip levels, so the page outline reads like a damaged table of contents.',
    wcag: ['1.3.1'],
    livedExperience:
      'A user navigating by headings (the fastest route through a page) jumps from h1 to h4 and cannot tell whether they skipped a section.',
    remediation: 'Use heading levels in order: h1, then h2, then h3.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Change the heading level so the sequence increases by one. Keep the visual size with CSS.',
      snippet: `<h2 class="text-3xl">Section</h2>`,
      acceptance:
        'After the fix, the reader announces heading levels 1, 2, 3 in order with no gaps.',
    }),
  },
  'landmark-one-main': {
    plainLanguage: 'The page has no main region, so "skip to content" has nowhere to go.',
    wcag: ['1.3.1'],
    livedExperience:
      'The user cannot jump past the navigation. On every page they re-listen to the same menu before reaching the content.',
    remediation: 'Wrap the primary content in a single <main>.',
    fix: () => ({
      target: 'app/page.tsx',
      instruction:
        'Wrap the page content in one <main> element. Navigation and footer stay outside it.',
      snippet: `<main id="content">…</main>`,
      acceptance:
        'After the fix, the reader announces "main" as a landmark right after the header.',
    }),
  },
  region: {
    plainLanguage:
      'Some content sits outside any landmark, so it is unreachable by landmark navigation.',
    wcag: ['1.3.1'],
    livedExperience:
      'A user jumping between landmarks never arrives at this content. It is effectively invisible.',
    remediation: 'Place all content inside header, nav, main, aside or footer.',
    fix: (n) => ({
      target: n.selector,
      instruction: 'Move this content inside <main> or another landmark, or wrap it in one.',
      snippet: `<main><section>…</section></main>`,
      acceptance: 'After the fix, landmark navigation reaches the content.',
    }),
  },
  'aria-hidden-focus': {
    plainLanguage:
      'An element is hidden from assistive tech but can still receive keyboard focus — a trap.',
    wcag: ['4.1.2'],
    livedExperience:
      'The user tabs into a control the reader refuses to describe. Focus vanishes into a hole and the only way out is to reload.',
    remediation:
      'Never apply aria-hidden to a container holding focusable elements; remove it or disable the children.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Remove aria-hidden from this container, or make the focusable children non-focusable with tabindex="-1" and disabled.',
      acceptance: 'After the fix, tabbing never lands on an element the reader will not announce.',
    }),
  },
  'nested-interactive': {
    plainLanguage: 'A control is nested inside another control, producing unpredictable behavior.',
    wcag: ['4.1.2'],
    livedExperience:
      'The reader announces one thing and the browser activates another. The user cannot predict the outcome.',
    remediation: 'Do not nest a button or link inside another interactive element.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Flatten the markup: the inner control must be a sibling, not a child, of the outer one.',
      acceptance: 'After the fix, each control is announced and activated independently.',
    }),
  },
  list: {
    plainLanguage: 'Content is styled as a list but is not marked up as one.',
    wcag: ['1.3.1'],
    livedExperience:
      'The reader does not announce "list, 5 items", so the user cannot judge how much content is coming.',
    remediation: 'Use <ul>/<ol> with <li> children for list content.',
    fix: (n) => ({
      target: n.selector,
      instruction: 'Replace the styled divs with <ul> and <li>, keeping the classes.',
      snippet: `<ul class="space-y-2"><li>…</li></ul>`,
      acceptance: 'After the fix, the reader announces "list, N items" before the items.',
    }),
  },
  'form-field-multiple-labels': {
    plainLanguage: 'A field has more than one label, so assistive tech may read the wrong one.',
    wcag: ['1.3.1', '3.3.2'],
    livedExperience:
      'The reader reads two conflicting labels for one field. The user is unsure which one applies.',
    remediation: 'Keep exactly one label per field.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Keep one label (the visible one) and remove the duplicate, or convert it to a hint with aria-describedby.',
      acceptance: 'After the fix, the reader announces one label for the field.',
    }),
  },
  'duplicate-id-aria': {
    plainLanguage:
      'Two elements share an id that ARIA references, so a label may point at the wrong field.',
    wcag: ['4.1.2'],
    livedExperience:
      'The reader announces the wrong name for a control, so the user acts on the wrong field.',
    remediation: 'Make ids unique across the page.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Give each element a unique id and update every aria-labelledby reference to match.',
      acceptance: 'After the fix, each control announces its own name.',
    }),
  },
  'scrollable-region-focusable': {
    plainLanguage: 'A scrollable area cannot be reached or scrolled with the keyboard.',
    wcag: ['2.1.1'],
    livedExperience:
      'A keyboard-only user cannot reach the content inside the box at all. On a laptop without a mouse, it is gone.',
    remediation: 'Give the scroll container tabindex="0" and a role or label.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Add tabindex="0" plus a role and aria-label so the region is reachable and named.',
      snippet: `<div class="overflow-auto" tabindex="0" role="region" aria-label="Recent activity">…</div>`,
      acceptance: 'After the fix, tab reaches the region and arrow keys scroll it.',
    }),
  },
  'aria-required-attr': {
    plainLanguage: 'A custom widget is missing a required ARIA attribute, so its state is unknown.',
    wcag: ['4.1.2'],
    livedExperience:
      'The reader announces a checkbox that never says checked or unchecked. The user cannot tell the current state.',
    remediation: 'Add the missing required ARIA attribute.',
    fix: (n) => ({
      target: n.selector,
      instruction: 'Add the ARIA attribute axe names in the failure summary, with a valid value.',
      acceptance: 'After the fix, the reader announces the widget together with its state.',
    }),
  },
  'target-size': {
    plainLanguage: 'A tap target is too small to hit reliably on a phone.',
    wcag: ['2.5.8'],
    livedExperience:
      'The user misses the control and triggers the neighbor. For someone with a tremor, this is the page becoming unusable.',
    remediation: 'Make interactive targets at least 24×24 CSS pixels, with spacing.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Increase the hit area to at least 24×24px, padding included, and leave 8px between neighbors.',
      snippet: `/* example */ min-width: 24px; min-height: 24px;`,
      acceptance: 'Re-run Preflight: target-size passes.',
    }),
  },
  'meta-viewport': {
    plainLanguage:
      'The page prevents zooming, so people who need magnification cannot enlarge the text.',
    wcag: ['1.4.4'],
    livedExperience:
      'The user pinches to zoom and nothing happens. There is no other way to read the page.',
    remediation: 'Remove maximum-scale and user-scalable=no from the viewport meta tag.',
    fix: () => ({
      target: 'app/layout.tsx or index.html',
      instruction: 'Allow zoom by removing maximum-scale and user-scalable=no.',
      snippet: `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
      acceptance: 'Re-run Preflight: meta-viewport passes and pinch-zoom works.',
    }),
  },
  'frame-title': {
    plainLanguage: 'An embedded frame has no title, so it cannot be identified.',
    wcag: ['4.1.2', '2.4.1'],
    livedExperience:
      'The reader announces "frame" and the user enters an unnamed context with no way back.',
    remediation: 'Give every iframe a title.',
    fix: (n) => ({
      target: n.selector,
      instruction: 'Add a title that names the embedded content.',
      snippet: `<iframe title="Checkout form" src="…"></iframe>`,
      acceptance: 'After the fix, the reader announces "iframe, Checkout form".',
    }),
  },
  'select-name': {
    plainLanguage: 'A dropdown has no label, so the user cannot know what they are choosing.',
    wcag: ['4.1.2', '1.3.1'],
    livedExperience: 'The reader says "combobox" with no name. The user opens it and guesses.',
    remediation: 'Label the select like any other field.',
    fix: (n) => ({
      target: n.selector,
      instruction: 'Add a <label for> or aria-label naming the choice.',
      snippet: `<label for="country">Country</label>\n<select id="country">…</select>`,
      acceptance: 'After the fix, the reader announces "combobox, Country".',
    }),
  },
  'aria-allowed-attr': {
    plainLanguage:
      'An ARIA attribute is used on a role that does not support it, so it is ignored.',
    wcag: ['4.1.2'],
    livedExperience:
      'The user is told a widget is expanded when it is not. They wait for content that never arrives.',
    remediation: 'Use only attributes the element role supports.',
    fix: (n) => ({
      target: n.selector,
      instruction:
        'Either change the role to one that supports the attribute, or remove the attribute.',
      acceptance: 'After the fix, the reader announces a state that matches what the screen shows.',
    }),
  },
};

/** Fallback used for rules outside the catalog. Never silent, never invented. */
export function fallbackCopy(
  id: string,
  help: string,
  description: string,
  wcagTags: string[],
): RuleCopy {
  const wcag = wcagTags
    .map((tag) => tag.match(/^wcag(\d)(\d)(\d+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => `${m[1]}.${m[2]}.${m[3]}`);

  return {
    plainLanguage: description,
    wcag,
    livedExperience: null,
    remediation: help,
    fix: (n) => ({
      target: n.selector,
      instruction: help,
      acceptance: `Re-run Preflight until the "${id}" rule no longer reports this element.`,
    }),
  };
}
