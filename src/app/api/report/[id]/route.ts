/**
 * Public report endpoint.
 *
 * A shareable link is the growth loop: an agency sends the report to a client,
 * the client forwards it, someone else tries a scan. Reports are immutable and
 * contain no visitor data, so exposing them by id is safe by construction — the
 * id is a random v4 UUID, not a guessable slug.
 */

import { NextResponse } from 'next/server';
import { getScan } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getScan(id);
  if (!result) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }
  return NextResponse.json(result, {
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
