'use client';

export default function CheckoutClient({ plan }: { plan: 'pro' | 'agency' }) {
  async function handleCheckout() {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 501) {
        window.location.href = `mailto:hello@kanam.studio?subject=Upgrade to ${plan}`;
        return;
      }

      if (!res.ok) throw new Error('Payment failed');

      const { url } = await res.json();
      window.location.href = url;
    } catch {
      window.location.href = `mailto:hello@kanam.studio?subject=Upgrade to ${plan}`;
    }
  }

  return (
    <button type="button" onClick={handleCheckout} style={{ width: '100%', display: 'block' }}>
      Upgrade to {plan === 'pro' ? 'Pro' : 'Agency'}
    </button>
  );
}
