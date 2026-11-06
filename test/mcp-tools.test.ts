import { describe, expect, it } from 'vitest';
import { createPreflightServer } from '../src/lib/mcp.js';

/**
 * Contract guard for the MCP surface.
 *
 * Lovable runs read-only tools without an approval card, which is the entire
 * reason the integration is usable. A tool registered without `readOnlyHint`
 * would silently introduce an approval prompt on every call — a regression that
 * no runtime error would ever reveal, and that nobody would notice until a user
 * complained.
 *
 * The check reads the tool descriptors the server actually publishes, not the
 * source, so a new tool cannot slip past by being registered differently.
 */
describe('MCP tool contract', () => {
  it('every registered tool is marked read-only', async () => {
    const server = createPreflightServer({ name: 'preflight-test', version: '0.0.0' });

    // The SDK exposes registration through a private map; reading the published
    // descriptor is the closest thing to what a client sees.
    const registered = (
      server as unknown as {
        _registeredTools?: Record<string, { annotations?: { readOnlyHint?: boolean } }>;
      }
    )._registeredTools;

    expect(registered, 'the SDK shape changed: update this guard deliberately').toBeDefined();

    const names = Object.keys(registered ?? {});
    expect(names.length).toBeGreaterThanOrEqual(5);

    for (const name of names) {
      const tool = registered?.[name];
      expect(tool?.annotations?.readOnlyHint, `tool "${name}" is not marked read-only`).toBe(true);
    }
  });

  it('no tool is explicitly destructive', async () => {
    const server = createPreflightServer({ name: 'preflight-test', version: '0.0.0' });
    const registered = (
      server as unknown as {
        _registeredTools?: Record<string, { annotations?: { destructiveHint?: boolean } }>;
      }
    )._registeredTools;

    for (const [name, tool] of Object.entries(registered ?? {})) {
      expect(tool.annotations?.destructiveHint, `tool "${name}" is destructive`).not.toBe(true);
    }
  });
});
