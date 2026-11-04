import Link from 'next/link';
import ScanForm from '@/components/ScanForm';
import { recentScans, type ScanSummary } from '@/lib/db';

export default async function Page() {
  let recent: ScanSummary[] = [];
  try {
    recent = await recentScans();
  } catch (e) {
    console.error('DB Error on homepage:', e);
  }

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
        <Link href="#how-it-works" className="muted">
          How it works
        </Link>
      </header>

      <main>
        <section className="hero">
          <h1>Your AI built the site. This proves it works.</h1>
          <p className="hero-sub">
            We read your page the way a screen reader does, then hand you the exact fix prompt to
            repair it.
          </p>
          <ScanForm />
          <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
            No account. 8 scans a day. Nothing is stored but the report.
          </p>
        </section>

        <section id="how-it-works">
          <h2>What you get</h2>
          <div className="grid">
            <div className="card">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3>The transcript</h3>
              <p className="muted">
                What a blind user actually hears, phrase by phrase, exactly as it is spoken.
              </p>
            </div>
            <div className="card">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h3>The verdict</h3>
              <p className="muted">
                A score that refuses to be green while someone is blocked from your site.
              </p>
            </div>
            <div className="card">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <h3>The fix prompt</h3>
              <p className="muted">
                Paste it into Lovable, Cursor or v0 and it repairs the page automatically.
              </p>
            </div>
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <h2 id="recent-heading">Recent scans</h2>
            <ul className="recent-list" aria-labelledby="recent-heading">
              {recent.map((scan) => (
                <li key={scan.id} className="recent-item">
                  <Link href={`/r/${scan.id}`} className="mono">
                    {scan.url}
                  </Link>
                  <span className={`badge badge-${scan.grade}`}>{scan.score}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="footer">
        <p className="muted">
          Disclaimer: Automated tools catch roughly a third of accessibility defects; manual testing
          by humans is still required for full compliance.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <span>Built by Kanam</span>
          <Link href="/pricing">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
