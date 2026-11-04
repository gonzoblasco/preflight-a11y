import { NextResponse } from 'next/server';

/**
 * Checkout.
 *
 * Stripe is the provider (the workspace decision); this route creates a
 * Checkout Session when a key is configured and returns 501 with a clear
 * message when it is not. A pricing page that silently does nothing is worse
 * than one that says "billing is not connected yet".
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRICE_ENV: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  agency: process.env.STRIPE_PRICE_AGENCY,
};

export async function POST(request: Request) {
  let plan: unknown;
  try {
    const body = await request.json();
    plan = typeof body === 'object' && body !== null ? (body as { plan?: unknown }).plan : undefined;
  } catch {
    return NextResponse.json({ error: 'Send {"plan":"pro"|"agency"}.' }, { status: 400 });
  }

  if (plan !== 'pro' && plan !== 'agency') {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = PRICE_ENV[plan];

  if (!secret || !price) {
    return NextResponse.json(
      {
        error: 'Billing is not connected yet.',
        detail:
          'Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO / STRIPE_PRICE_AGENCY to enable checkout. Until then, email hello@preflight.dev and a scan credit is issued manually.',
        mailto: `mailto:hello@preflight.dev?subject=Preflight%20${plan}%20plan`,
      },
      { status: 501 },
    );
  }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/pricing?session={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${origin}/pricing?status=cancelled`,
    allow_promotion_codes: 'true',
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[preflight] stripe error', response.status, text);
    return NextResponse.json({ error: 'Checkout could not be created.' }, { status: 502 });
  }

  const session = (await response.json()) as { url?: string };
  if (!session.url) {
    return NextResponse.json({ error: 'Checkout session had no URL.' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST.' }, { status: 405 });
}
