import { NextResponse } from 'next/server';
import { saveScan } from '@/lib/db';
import { checkQuota, fingerprint, recordUsage } from '@/lib/ratelimit';
import { ScanError, scanPage } from '@/lib/scan';
import { guardUrl } from '@/lib/url-guard';

// The scanner drives a real browser; it must run in Node, never in an edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with a "url" field.' }, { status: 400 });
  }

  const rawUrl =
    typeof body === 'object' && body !== null ? (body as { url?: unknown }).url : undefined;
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return NextResponse.json({ error: 'Enter a URL to scan.' }, { status: 400 });
  }

  const key = fingerprint(clientIp(request));
  const quota = checkQuota(key);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason },
      {
        status: 429,
        headers: quota.retryAfterSeconds
          ? { 'retry-after': String(quota.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  const guard = await guardUrl(rawUrl);
  if (!guard.ok || !guard.url) {
    return NextResponse.json(
      { error: guard.reason ?? 'That URL cannot be scanned.' },
      { status: 400 },
    );
  }

  // A scan costs a browser context. Never start one the quota will not pay for.
  recordUsage(key);

  try {
    const result = await scanPage(guard.url.toString());
    saveScan(result);
    return NextResponse.json({
      id: result.id,
      score: result.score,
      findings: result.findings.length,
      durationMs: result.durationMs,
      remainingToday: Math.max(0, quota.remainingToday - 1),
    });
  } catch (error) {
    if (error instanceof ScanError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error('[preflight] scan failed', error);
    return NextResponse.json(
      {
        error:
          'The scan failed for an unexpected reason. The site may be blocking automated visits.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST with {"url": "https://example.com"}.' },
    { status: 405 },
  );
}
