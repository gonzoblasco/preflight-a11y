import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '10rem 0' }}>
      <h1>404</h1>
      <p className="muted">The report you are looking for doesn't exist or has expired.</p>
      <Link href="/" style={{ display: 'inline-block', marginTop: '2rem', fontWeight: 600 }}>
        ← Return to Preflight
      </Link>
    </div>
  );
}
