import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="container">
      <header className="header">
        <Link href="/" className="wordmark">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m12 14 4-4-4-4" />
            <path d="M3 10h18" />
            <path d="m12 10 4 4-4 4" />
            <path d="M3 14h18" />
          </svg>
          preflight
        </Link>
      </header>

      <main style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1>Simple, transparent pricing.</h1>
        <div className="grid">
          <div className="card">
            <h3>Free</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '1rem 0' }}>$0</div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                textAlign: 'left',
                margin: '2rem 0',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}
            >
              <li>✓ 8 scans per day</li>
              <li>✓ Public reports</li>
              <li>✓ No account needed</li>
              <li>✓ Standard AI prompts</li>
            </ul>
            <Link
              href="/"
              style={{
                display: 'block',
                background: 'var(--border)',
                color: 'var(--text-main)',
                padding: '0.75rem',
                borderRadius: '4px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Start scanning
            </Link>
          </div>

          <div className="card" style={{ borderColor: 'var(--accent)', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--accent)',
                color: 'var(--text-on-accent)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              POPULAR
            </span>
            <h3>Pro</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '1rem 0' }}>
              $29<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/mo</span>
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                textAlign: 'left',
                margin: '2rem 0',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}
            >
              <li>✓ Unlimited scans</li>
              <li>✓ Shareable report links</li>
              <li>✓ Reports kept indefinitely</li>
              <li>✓ Email support</li>
              <li>✓ Every rule explained in plain language</li>
            </ul>
            <CheckoutButton plan="pro" />
          </div>

          <div className="card">
            <h3>Agency</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '1rem 0' }}>
              $99<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/mo</span>
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                textAlign: 'left',
                margin: '2rem 0',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}
            >
              <li>✓ Everything in Pro</li>
              <li>✓ 25 client reports per month</li>
              <li>✓ Branded report header</li>
              <li>✓ CLI for CI gates</li>
              <li>✓ Email support, next business day</li>
            </ul>
            <CheckoutButton plan="agency" />
          </div>
        </div>
        <p
          className="muted"
          style={{ maxWidth: '46rem', margin: '3rem auto 0', fontSize: '0.875rem' }}
        >
          Preflight is at version 0.1.0. Billing is not connected yet: choosing a plan today emails
          us and a credit is issued by hand. Everything listed on the Free tier works now and is
          verified by scanning this site with itself.
        </p>
      </main>
    </div>
  );
}

function CheckoutButton({ plan }: { plan: 'pro' | 'agency' }) {
  return <CheckoutClient plan={plan} />;
}

// This is a trick to keep the page static but the button client
import CheckoutClient from '@/components/CheckoutClient';
