// A transcript and a node list are positional by definition: phrase 7 is the
// seventh thing spoken, and two nodes of one rule can share a selector. Index
// keys are the correct identity here, so the rule is disabled file-wide.
// biome-ignore-all lint/suspicious/noArrayIndexKey: ordered evidence, not a list of entities
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CopyButton from '@/components/CopyButton';
import { getScan } from '@/lib/db';
import { verdict } from '@/lib/score';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = getScan(id);

  if (!scan) notFound();

  const { score, narration, findings, signals, fixPrompt, limits } = scan;

  // Grade Color Logic: Never green if blocking > 0
  const getGradeColor = (grade: string, blocking: number) => {
    if (blocking > 0) return 'badge-F';
    switch (grade) {
      case 'A':
        return 'badge-A';
      case 'B':
        return 'badge-B';
      case 'C':
        return 'badge-C';
      case 'D':
        return 'badge-D';
      default:
        return 'badge-F';
    }
  };

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

      <main>
        <section className="score-block">
          <span className={`score-grade ${getGradeColor(score.grade, score.blocking)}`}>
            {score.grade}
          </span>
          <span className="score-value mono">{score.value}/100</span>
          <p className="muted" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
            {verdict(score)}
          </p>
        </section>

        <section>
          <h2>The Transcript</h2>
          <p className="muted">
            This is exactly what is spoken by the screen reader, not necessarily what is in the DOM.
          </p>
          <div className="transcript">
            <p
              className="mono"
              style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-muted)' }}
            >
              Read by {narration.matrix.reader} {narration.matrix.version} on {narration.matrix.os}
            </p>
            <ol className="transcript-list">
              {narration.phrases.map((phrase, i) => {
                const gap = narration.gaps.find((g) => g.at === i);
                return (
                  <li
                    key={`${phrase}-${i}`}
                    className={`transcript-row ${gap ? 'transcript-gap' : ''}`}
                  >
                    <span className="transcript-index">{i + 1}.</span>
                    <span>{phrase}</span>
                    {gap && (
                      <span className="muted" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>
                        {gap.hears}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section>
          <h2>Findings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {findings.map((f) => (
              <details key={f.id} className="finding">
                <summary>
                  <span className={`impact-pill impact-${f.impact}`}>{f.impact}</span>
                  {f.title}
                  <span className="muted mono" style={{ marginLeft: 'auto', fontSize: '0.875rem' }}>
                    {f.nodes.length} {f.nodes.length === 1 ? 'element' : 'elements'}
                    {f.wcag.length > 0 ? ` • WCAG ${f.wcag.join(', ')}` : ''}
                  </span>
                </summary>
                <div className="finding-content">
                  <p>{f.plainLanguage}</p>
                  {f.livedExperience && <blockquote>{f.livedExperience}</blockquote>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {f.nodes.map((node, ni) => (
                      <div key={`${node.selector}-${ni}`}>
                        <div
                          className="mono"
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.25rem',
                          }}
                        >
                          {node.selector}
                        </div>
                        <pre>
                          <code className="evidence">{node.html}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '3rem' }}>
          <h2>The Fix Prompt</h2>
          <details
            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
              Show prompt for AI builder
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <pre>
                <code>{fixPrompt.text}</code>
              </pre>
              <CopyButton text={fixPrompt.text} />
            </div>
          </details>
        </section>

        <section>
          <h2>Signals</h2>

          {/*
            The named-control ratio is the fastest way for someone who does not
            know what ARIA is to feel the problem: "most of your buttons have no
            name" needs no vocabulary. It was buried in a definition list next to
            the viewport value, which is why it sat unread.
          */}
          <div className="headline-metric">
            <p className="headline-metric__value mono">{Math.round(signals.namedRatio * 100)}%</p>
            <p className="headline-metric__label">
              of this page&rsquo;s {signals.interactiveCount} interactive elements have a name a
              screen reader can announce.
              {signals.namedRatio < 1 && (
                <>
                  {' '}
                  The other{' '}
                  {Math.max(
                    0,
                    signals.interactiveCount -
                      Math.round(signals.interactiveCount * signals.namedRatio),
                  )}{' '}
                  are announced as their role alone, with nothing to identify them.
                </>
              )}
            </p>
            <div
              className="headline-metric__bar"
              role="img"
              aria-label={`${Math.round(signals.namedRatio * 100)} percent of interactive elements are named`}
            >
              <span
                className="headline-metric__fill"
                style={{ width: `${Math.round(signals.namedRatio * 100)}%` }}
              />
            </div>
          </div>

          <dl className="signals-dl">
            <div>
              <dt className="signals-dt">Language</dt>
              <dd className="signals-dd">{signals.lang || 'Not detected'}</dd>
            </div>
            <div>
              <dt className="signals-dt">Viewport</dt>
              <dd className="signals-dd">{signals.viewport || 'Not detected'}</dd>
            </div>
            <div>
              <dt className="signals-dt">Interactive elements</dt>
              <dd className="signals-dd">{signals.interactiveCount}</dd>
            </div>
            <div>
              <dt className="signals-dt">Images without alt</dt>
              <dd className="signals-dd">{signals.imagesWithoutAlt}</dd>
            </div>
            <div>
              <dt className="signals-dt">Form fields without a label</dt>
              <dd className="signals-dd">{signals.formsWithoutLabels}</dd>
            </div>
            <div>
              <dt className="signals-dt">Placeholder-only labels</dt>
              <dd className="signals-dd">{signals.placeholderOnlyLabels}</dd>
            </div>
            <div>
              <dt className="signals-dt">Skip link</dt>
              <dd className="signals-dd">{signals.hasSkipLink ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <h3>Heading Outline</h3>
          <ul className="mono" style={{ listStyle: 'none', padding: 0 }}>
            {signals.headingOutline.map((h) => (
              <li
                key={`${h.level}-${h.text}`}
                style={{ marginLeft: `${(h.level - 1) * 1.5}rem`, marginBottom: '0.25rem' }}
              >
                <span className="muted">{h.level}.</span> {h.text}
              </li>
            ))}
          </ul>
        </section>

        <section
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'var(--bg-surface)',
            borderRadius: '8px',
          }}
        >
          <h2>What this scan cannot see</h2>
          <ul className="muted" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
            {limits.map((limit) => (
              <li key={limit} style={{ marginBottom: '0.5rem' }}>
                {limit}
              </li>
            ))}
          </ul>
        </section>

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <Link href="/" style={{ fontWeight: 600 }}>
            ← Scan another page
          </Link>
        </div>
      </main>
    </div>
  );
}
