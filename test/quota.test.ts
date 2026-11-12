/**
 * Quota accounting: charge before the browser, refund when the failure is ours.
 *
 * The ordering is deliberate and must not be "simplified" to charge-after-success.
 * Charging after the scan would let a caller hammer failing URLs for free, because
 * every attempt spawns a browser and only the successful one would be billed.
 * Charging before means a *site* that refuses still costs a scan — that is the
 * price of asking — but a crash on our side must not.
 *
 * This file pins the second half. The first half has no test because it is a
 * product judgement, not an invariant.
 */
import { describe, expect, it } from 'vitest';
import { refundUsage, recordUsage } from '../src/lib/ratelimit';
import { getDb } from '../src/lib/db';

const key = `test-refund-${Date.now()}`;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function used(): number {
  const row = getDb()
    .prepare('SELECT count FROM usage WHERE key = ? AND day = ?')
    .get(key, today()) as { count: number } | undefined;
  return row?.count ?? 0;
}

describe('quota refund', () => {
  it('returns the slot after one charge', () => {
    expect(used()).toBe(0);
    recordUsage(key);
    expect(used()).toBe(1);
    refundUsage(key);
    expect(used()).toBe(0);
  });

  it('never goes below zero on a double refund', () => {
    refundUsage(key);
    refundUsage(key);
    expect(used()).toBe(0);
  });

  it('refunds only one of several charges', () => {
    recordUsage(key);
    recordUsage(key);
    recordUsage(key);
    expect(used()).toBe(3);
    refundUsage(key);
    expect(used()).toBe(2);
  });
});
