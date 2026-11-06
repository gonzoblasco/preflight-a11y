#!/usr/bin/env node

/**
 * Preflight MCP entry point.
 *
 * Two transports, one server:
 *
 *   --stdio   a local agent launches this as a subprocess (Claude Code, OpenClaw)
 *   --http    a remote client reaches it by URL (Lovable, v0, Cursor)
 *
 * HTTP mode requires a bearer token when PREFLIGHT_MCP_TOKEN is set. That is the
 * billing boundary as much as the security one: each scan drives a real browser,
 * so an unauthenticated public endpoint is a free compute faucet.
 *
 * Usage:
 *   node dist/mcp-cli.js --stdio
 *   PORT=8080 PREFLIGHT_MCP_TOKEN=*** node dist/mcp-cli.js --http
 */

import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createPreflightServer } from './mcp.js';
import { fingerprint } from './ratelimit.js';
import { activeScans, closeBrowser } from './scan.js';

const VERSION = '0.1.0';
const mode = process.argv.includes('--http') ? 'http' : 'stdio';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Constant-time comparison against the configured token. */
function authorized(req: IncomingMessage): boolean {
  const expected = process.env.PREFLIGHT_MCP_TOKEN;
  // No token configured is only reachable when we are not in production:
  // runHttp() refuses to start in that case. Local dev gets through.
  if (!expected) return true;
  const header = req.headers.authorization ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * Quota identity for a request: a hash of the token, never the token itself.
 * The database stores usage counters keyed by this, so a leaked DB row cannot be
 * replayed as a credential.
 */
function quotaKeyFor(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return undefined;
  return fingerprint(token, process.env.PREFLIGHT_SALT ?? 'preflight-mcp');
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    // A scan payload never approaches this; anything larger is abuse.
    if (size > 1_000_000) throw new Error('Request body too large');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function runHttp(): Promise<void> {
  const port = Number(process.env.PORT ?? 8080);
  const requireToken = Boolean(process.env.PREFLIGHT_MCP_TOKEN);

  /**
   * Fail closed in production.
   *
   * Without a token the server authenticates nobody, and every scan would be an
   * unauthenticated Chromium on our machine. Allowing that in local development
   * is convenient; allowing it where the process is reachable is a free compute
   * faucet. The decision is explicit, not inferred from NODE_ENV.
   */
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.PREFLIGHT_REQUIRE_AUTH === '1';
  if (isProduction && !requireToken) {
    process.stderr.write(
      'preflight-mcp: refusing to start. PREFLIGHT_MCP_TOKEN is required when NODE_ENV=production ' +
        '(or PREFLIGHT_REQUIRE_AUTH=1). An unauthenticated HTTP server exposes unlimited scans.\n',
    );
    process.exit(1);
  }

  const httpServer = createServer(async (req, res) => {
    // CORS is permissive on purpose: MCP clients are user agents, and the
    // token is the actual gate. A browser origin is never trusted here.
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, authorization, mcp-session-id');
    res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('access-control-expose-headers', 'mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health') {
      // Unauthenticated liveness, but deliberately thin.
      //
      // This endpoint sits in front of auth because an orchestrator must be able
      // to tell "process up" from "process wedged" without holding a credential.
      // The cost is that anyone on the internet can read it, so it reports only
      // whether the service is alive — not its version, not how busy it is.
      // Operational detail belongs behind the token, where it cannot be used as
      // free reconnaissance.
      json(res, 200, { status: 'ok' });
      return;
    }

    if (req.url === '/status') {
      if (!authorized(req)) {
        json(res, 401, { error: 'Missing or invalid bearer token.' });
        return;
      }
      json(res, 200, {
        status: 'ok',
        service: 'preflight-mcp',
        version: VERSION,
        auth: requireToken,
        // An operator needs to see saturation before a client reports a slow
        // scan; a stranger does not.
        activeScans: activeScans(),
        maxConcurrent: Number(process.env.PREFLIGHT_MAX_CONCURRENT ?? 4),
      });
      return;
    }

    if (!authorized(req)) {
      json(res, 401, {
        error: 'Missing or invalid bearer token.',
        hint: 'Send Authorization: Bearer <token>. Tokens are issued per plan.',
      });
      return;
    }

    // Stateless mode: every request creates its own transport and server.
    // Stateful sessions would pin a browser context to a client that may never
    // return, and the scan is stateless by nature.
    const server = createPreflightServer({
      name: 'preflight',
      version: VERSION,
      allowPrivate: false,
      quotaKey: quotaKeyFor(req),
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);

    try {
      const body = await readBody(req);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!res.headersSent) json(res, 400, { error: message });
    } finally {
      await server.close().catch(() => undefined);
    }
  });

  httpServer.listen(port, () => {
    process.stderr.write(
      `preflight-mcp listening on :${port} (http, auth=${requireToken ? 'bearer' : 'none'})\n`,
    );
  });

  const shutdown = () => {
    httpServer.close();
    void closeBrowser().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function runStdio(): Promise<void> {
  // Local agents run on the same machine as the developer: scanning localhost is
  // the primary use case, not an attack surface.
  const server = createPreflightServer({ name: 'preflight', version: VERSION, allowPrivate: true });
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = () => {
    void closeBrowser().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (mode === 'http') {
  await runHttp();
} else {
  await runStdio();
}
