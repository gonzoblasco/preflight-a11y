/**
 * Narration: what the page sounds like.
 *
 * This is the layer that makes Preflight different from every axe wrapper. We
 * take the rendered HTML, hand it to a screen reader, and record the exact
 * phrases it speaks, in order. A finding says "image-alt failed"; the
 * narration says `"image"` — the sound of a person losing the plot.
 *
 * The virtual driver uses process-global `window`/`document`, so calls are
 * serialized through a mutex. Two concurrent scans must not share a document.
 */

import { virtual } from '@guidepup/virtual-screen-reader';
import { JSDOM } from 'jsdom';
import type { Narration, NarrationGap } from './types';

const MAX_STEPS = 4000;

/**
 * Structural noise. `paragraph` / `end of paragraph` is true to the reader but
 * says nothing a founder can act on; keeping it would bury the signal on any
 * text-heavy page. Containers that carry meaning (list, form, dialog) stay.
 */
const NOISE = new Set([
  'paragraph',
  'end of paragraph',
  'end of text',
  'text',
  'end of link',
  'end of heading',
  'end of listitem',
  'end of image',
]);

function isNoise(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase();
  if (NOISE.has(normalized)) return true;
  // "listitem, level 1, position 1, set size 2" is pure bookkeeping.
  return /^listitem, level \d+, position \d+/.test(normalized);
}

/**
 * Roles whose accessible name is *required* to act on them. A nameless list or
 * region is normal markup, not a defect — flagging those would train the reader
 * of the report to ignore the markers, which is worse than missing one.
 */
const ROLE_PHRASES = new Set([
  'image',
  'button',
  'link',
  'textbox',
  'combobox',
  'checkbox',
  'radio',
  'slider',
  'searchbox',
  'spinbutton',
  'switch',
  'tab',
  'menuitem',
  'iframe',
  'frame',
]);

let queue: Promise<unknown> = Promise.resolve();

/** Serializes access to the process-global DOM the reader depends on. */
function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Plain-language description of what a nameless role costs the user. */
function describeGap(phrase: string): string {
  switch (phrase) {
    case 'image':
      return 'an image with no name — the user has no idea what it shows';
    case 'button':
      return 'a button with no name — the user cannot tell what pressing it does';
    case 'link':
      return 'a link with no name — the user cannot tell where it goes';
    case 'textbox':
    case 'combobox':
    case 'searchbox':
      return 'a field with no name — the user cannot tell what to type';
    case 'checkbox':
      return 'a checkbox with no name — the user cannot tell what it toggles';
    case 'iframe':
    case 'frame':
      return 'an embedded frame with no name — the user enters it blind';
    default:
      return `a ${phrase} with no name`;
  }
}

/**
 * Walks rendered HTML with the virtual screen reader and returns the spoken
 * log plus the gaps where a role was announced without a name.
 */
export async function narrate(html: string, lang = 'en'): Promise<Narration> {
  return withLock(async () => {
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const previous = {
      window: globalThis.window,
      document: globalThis.document,
    };

    // The driver reads the globals, not a parameter (its API contract).
    (globalThis as unknown as { window: unknown }).window = dom.window;
    (globalThis as unknown as { document: unknown }).document = dom.window.document;
    void lang;

    const phrases: string[] = [];
    try {
      await virtual.start({ container: dom.window.document.body });
      for (let step = 0; step < MAX_STEPS; step += 1) {
        const phrase = await virtual.lastSpokenPhrase();
        if (phrase === 'end of document') break;
        if (!isNoise(phrase)) phrases.push(phrase);
        await virtual.next();
      }
    } finally {
      try {
        await virtual.stop();
      } catch {
        // Stopping a reader that never started is not an error worth surfacing.
      }
      (globalThis as unknown as { window: unknown }).window = previous.window;
      (globalThis as unknown as { document: unknown }).document = previous.document;
    }

    const gaps: NarrationGap[] = [];
    const cleanPhrases = phrases;
    cleanPhrases.forEach((phrase, at) => {
      const normalized = phrase.trim().toLowerCase();
      if (ROLE_PHRASES.has(normalized)) {
        gaps.push({
          at,
          phrase,
          role: normalized,
          hears: describeGap(normalized),
        });
      }
    });

    return {
      matrix: {
        reader: 'virtual (Guidepup)',
        version: await virtualVersion(),
        os: 'jsdom, platform-independent',
      },
      phrases: cleanPhrases,
      gaps,
    };
  });
}

async function virtualVersion(): Promise<string> {
  try {
    const pkg = (await import('@guidepup/virtual-screen-reader/package.json', {
      with: { type: 'json' },
    })) as { default?: { version?: string }; version?: string };
    return (pkg.default?.version ?? pkg.version ?? 'unknown') as string;
  } catch {
    return 'unknown';
  }
}
