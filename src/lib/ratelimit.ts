/**
 * Rate limiting and quota.
 *
 * A scanner that takes an arbitrary URL is an abuse magnet: free CPU for
 * scrapers, free load-testing, free port scanning. Three layers, cheapest
 * first:
 *   1. per-IP burst limit (in memory, resets on restart — cheap and enough)
 *   2. per-IP daily cap (SQLite, survives restarts)
 *   3. per-license quota, when the visitor paid
 *
 * Limits are read from env so a self-hosted owner can loosen them without a
 * code change. Nothing here is a security boundary; the URL guard is.
 */

import { createHash } from 'node:crypto';
import { getDb } from './db';

const BURST_WINDOW_MS = 60_000;
const BURST_MAX = Number(process.env.PREFLIGHT_BURST_MAX ?? 3);
const DAILY_MAX = Number(process.env.PREFLIGHT_DAILY_MAX ?? 8);

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Hashes the IP so the database never holds raw addresses. */
export function fingerprint(ip: string, salt = process.env.PREFLIGHT_SALT ?? 'preflight'): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: string;
  remainingBurst: number;
  remainingToday: number;
  retryAfterSeconds?: number;
}

export function checkQuota(key: string): QuotaDecision {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + BURST_WINDOW_MS });
  } else if (bucket.count >= BURST_MAX) {
    return {
      allowed: false,
      reason: `Too many scans. Try again in ${Math.ceil((bucket.resetAt - now) / 1000)}s.`,
      remainingBurst: 0,
      remainingToday: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  } else {
    bucket.count += 1;
  }

  const row = getDb()
    .prepare('SELECT count FROM usage WHERE key = ? AND day = ?')
    .get(key, today()) as { count: number } | undefined;
  const used = row?.count ?? 0;

  if (used >= DAILY_MAX) {
    return {
      allowed: false,
      reason: `You have used all ${DAILY_MAX} free scans for today. They reset at 00:00 UTC.`,
      remainingBurst: Math.max(0, BURST_MAX - (buckets.get(key)?.count ?? 0)),
      remainingToday: 0,
    };
  }

  return {
    allowed: true,
    remainingBurst: Math.max(0, BURST_MAX - (buckets.get(key)?.count ?? 0)),
    remainingToday: Math.max(0, DAILY_MAX - used),
  };
}

export function recordUsage(key: string): void {
  getDb()
    .prepare(
      `INSERT INTO usage (key, day, count) VALUES (?, ?, 1)
       ON CONFLICT(key, day) DO UPDATE SET count = count + 1`,
    )
    .run(key, today());
}

/**
 * Gives back one scan charged by `recordUsage`.
 *
 * Quota is charged before the browser starts, because refusing afterwards still
 * costs the CPU. That ordering is correct for a refused or rejected target: the
 * work was attempted against a site that said no. It is wrong for a failure on
 * our side — a crash, a killed machine, an unexpected exception — where the
 * caller received nothing and would otherwise lose a paid scan to our bug.
 *
 * Clamped at zero so a refund can never create credit.
 */
export function refundUsage(key: string): void {
  getDb()
    .prepare(
      `UPDATE usage SET count = MAX(0, count - 1) WHERE key = ? AND day = ?`,
    )
    .run(key, today());
}

/** Evicts expired burst buckets so a long-lived process does not grow forever. */
export function sweepBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
