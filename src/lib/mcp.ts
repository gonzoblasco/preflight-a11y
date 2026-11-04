/**
 * Preflight MCP server.
 *
 * Why this exists: a builder that generates a page should be able to *ask* if the
 * page is usable, instead of hoping someone remembers to run a report. Exposing
 * Preflight over MCP puts the gate inside the agent loop that writes the code.
 *
 * Design constraint that shapes everything here:
 *
 *   Every tool is READ-ONLY, and says so in its annotations (`readOnlyHint`).
 *
 * Lovable (verified in docs, 2026-11-04) runs read-only tools **without an
 * approval card**. A write tool would prompt the user on every call and make the
 * integration useless. It is also the correct product boundary: Preflight
 * measures the page, it never edits the customer's project.
 *
 * Every result carries the reader matrix. An announcement is only valid against
 * the reader that produced it, so the matrix travels with the observation
 * (same contract as kanam-fixer's ADR-0002).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { narrate } from './narrate.js';
import { RULES } from './rules.js';
import { ScanError, scanPage } from './scan.js';
import { verdict } from './score.js';
import { guardUrl } from './url-guard.js';

const urlSchema = z
  .string()
  .min(1)
  .describe('Public http(s) URL to inspect. Private addresses are refused.');

const htmlSchema = z
  .string()
  .min(1)
  .describe('HTML snippet. A fragment is fine; it is wrapped in a document.');

/** Read-only annotations, reused so no tool can be registered without them. */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function text(value: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function failure(message: string): {
  content: { type: 'text'; text: string }[];
  isError: true;
} {
  return { ...text({ error: message }), isError: true };
}

function describe(error: unknown): string {
  if (error instanceof ScanError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

export interface PreflightServerInfo {
  name: string;
  version: string;
}

/**
 * Builds the MCP server. Transport is the caller's choice: stdio for a local CLI,
 * streamable HTTP for a remote client such as Lovable or v0.
 */
export function createPreflightServer(info: PreflightServerInfo): McpServer {
  const server = new McpServer(
    { name: info.name, version: info.version },
    {
      capabilities: { tools: {} },
      instructions:
        'Preflight is a pre-launch accessibility gate for AI-generated websites. ' +
        'It renders the page in a real browser, checks it against axe-core, and reads it ' +
        'with a screen reader. Use scan_url after generating or changing a page, ' +
        'get_fix_prompt to obtain an actionable repair, and read_announcements to see ' +
        'what a blind visitor actually hears. Every tool is read-only: Preflight never ' +
        'modifies the project. Scores cannot be an A while a finding blocks a task.',
    },
  );

  server.registerTool(
    'scan_url',
    {
      title: 'Scan a page for accessibility defects',
      description:
        'Renders the URL in a real browser and returns a score, the blocking count and ' +
        'every finding with plain-language explanation and the lived experience of a ' +
        'screen reader user. Call this after building or editing a page. Grade A means ' +
        'no blocking defect was found; it never means WCAG compliant.',
      inputSchema: { url: urlSchema },
      annotations: { ...READ_ONLY, title: 'Scan a page for accessibility defects' },
    },
    async ({ url }) => {
      const guard = await guardUrl(url);
      if (!guard.ok || !guard.url) return failure(guard.reason ?? 'That URL cannot be scanned.');

      try {
        const result = await scanPage(guard.url.toString());
        return text({
          url: result.finalUrl,
          score: result.score,
          verdict: verdict(result.score),
          findings: result.findings.map((f) => ({
            id: f.id,
            impact: f.impact,
            title: f.title,
            plainLanguage: f.plainLanguage,
            livedExperience: f.livedExperience,
            elements: f.nodes.length,
            wcag: f.wcag,
            exampleSelector: f.nodes[0]?.selector ?? null,
          })),
          narrationMatrix: result.narration.matrix,
          limits: result.limits,
        });
      } catch (error) {
        return failure(describe(error));
      }
    },
  );

  server.registerTool(
    'read_announcements',
    {
      title: 'Read what a screen reader announces',
      description:
        'Walks the given HTML with a screen reader and returns every phrase it speaks, ' +
        'in order, plus the gaps where a control was announced without a name. This is ' +
        'the observation no attribute-based linter can produce: it is the experience.',
      inputSchema: { html: htmlSchema },
      annotations: { ...READ_ONLY, title: 'Read what a screen reader announces' },
    },
    async ({ html }) => {
      try {
        const narration = await narrate(html);
        return text({
          matrix: narration.matrix,
          phrases: narration.phrases,
          gaps: narration.gaps,
          totalPhrases: narration.phrases.length,
          totalGaps: narration.gaps.length,
        });
      } catch (error) {
        return failure(describe(error));
      }
    },
  );

  server.registerTool(
    'assert_announcement',
    {
      title: 'Assert an exact announcement sequence',
      description:
        'Reads the HTML with a screen reader and checks the announced sequence against an ' +
        'expected one. Returns passed, the expected sequence, what was actually announced, ' +
        'and the reader matrix. Use it as an acceptance test for accessibility fixes.',
      inputSchema: {
        html: htmlSchema,
        expected: z
          .array(z.string())
          .min(1)
          .describe('Ordered phrases the reader must announce, exactly as spoken.'),
      },
      annotations: { ...READ_ONLY, title: 'Assert an exact announcement sequence' },
    },
    async ({ html, expected }) => {
      try {
        const narration = await narrate(html);
        const same =
          narration.phrases.length === expected.length &&
          narration.phrases.every((phrase, index) => phrase === expected[index]);

        return text({
          passed: same,
          expected,
          announced: narration.phrases,
          matrix: narration.matrix,
          ...(same
            ? {}
            : {
                firstDifference: expected.findIndex((p, i) => p !== narration.phrases[i]),
              }),
        });
      } catch (error) {
        return failure(describe(error));
      }
    },
  );

  server.registerTool(
    'get_fix_prompt',
    {
      title: 'Get a repair prompt an AI builder can execute',
      description:
        'Returns an ordered, copy-pasteable prompt that repairs the page. Each step names ' +
        'the element, the change, and the announcement the reader must produce afterwards. ' +
        'Paste it into the builder that generated the page. The prompt is read-only: ' +
        "applying it is the builder's job, and verifying the result is this tool's.",
      inputSchema: { url: urlSchema },
      annotations: { ...READ_ONLY, title: 'Get a repair prompt an AI builder can execute' },
    },
    async ({ url }) => {
      const guard = await guardUrl(url);
      if (!guard.ok || !guard.url) return failure(guard.reason ?? 'That URL cannot be scanned.');

      try {
        const result = await scanPage(guard.url.toString());
        return text({
          url: result.finalUrl,
          score: result.score,
          steps: result.fixPrompt.steps,
          prompt: result.fixPrompt.text,
          note:
            'If your executor cannot verify the acceptance line, it must mark the step ' +
            'UNVERIFIED and continue — never stop. Measured failure on a real builder.',
        });
      } catch (error) {
        return failure(describe(error));
      }
    },
  );

  server.registerTool(
    'explain_rule',
    {
      title: 'Explain an accessibility rule in plain language',
      description:
        'Returns what a rule costs a real person: plain-language summary, the lived ' +
        'experience of a screen reader user, the WCAG criteria, and how to fix it. ' +
        'Cheap and cacheable; use it to understand a finding before acting on it.',
      inputSchema: {
        rule: z.string().min(1).describe('axe rule id, e.g. "image-alt" or "color-contrast".'),
      },
      annotations: { ...READ_ONLY, title: 'Explain an accessibility rule in plain language' },
    },
    async ({ rule }) => {
      const copy = RULES[rule];
      if (!copy) {
        return failure(
          `Unknown rule "${rule}". Preflight has product-grade copy for ${Object.keys(RULES).length} rules; ` +
            'use scan_url to see which rules a page actually fails.',
        );
      }
      return text({
        rule,
        plainLanguage: copy.plainLanguage,
        livedExperience: copy.livedExperience,
        wcag: copy.wcag,
        remediation: copy.remediation,
      });
    },
  );

  return server;
}
