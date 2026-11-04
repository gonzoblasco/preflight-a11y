/**
 * URL guard.
 *
 * Preflight takes a URL from an anonymous visitor and makes a server-side
 * request with it. That is textbook SSRF: without a guard, the first visitor
 * points it at 127.0.0.1 or 169.254.169.254 and reads our own network from the
 * inside. The guard runs *twice* — once on the literal host, once after DNS
 * resolution — because a hostname can resolve to a private address.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const BLOCKED_V4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const;

function v4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
    const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return false;
  }
  if (isIP(ip) !== 4) return false;
  const value = v4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (v4ToInt(base) & mask);
  });
}

export interface UrlGuardResult {
  ok: boolean;
  url?: URL;
  reason?: string;
}

export interface GuardOptions {
  /**
   * Allows private hosts. Only the CLI sets this, behind an explicit flag, so
   * dogfooding a local build is possible without opening the API to SSRF.
   */
  allowPrivate?: boolean;
}

/**
 * Validates a URL for scanning. Rejects non-HTTP schemes, credentials in the
 * URL, private hosts, and hostnames that resolve to private addresses.
 */
export async function guardUrl(input: string, options: GuardOptions = {}): Promise<UrlGuardResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: 'Enter a URL.' };

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: 'That does not look like a URL.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs can be scanned.' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not accepted.' };
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (options.allowPrivate) {
    return { ok: true, url };
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { ok: false, reason: 'Private hosts are not scannable.' };
  }
  if (isIP(host)) {
    return isPrivateAddress(host)
      ? { ok: false, reason: 'Private addresses are not scannable.' }
      : { ok: true, url };
  }

  try {
    const records = await lookup(host, { all: true });
    if (records.length === 0) {
      return { ok: false, reason: 'That domain did not resolve.' };
    }
    if (records.some((r) => isPrivateAddress(r.address))) {
      return { ok: false, reason: 'That domain resolves to a private address.' };
    }
  } catch {
    return { ok: false, reason: 'That domain did not resolve.' };
  }

  return { ok: true, url };
}
