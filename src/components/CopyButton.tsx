'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={copy}
        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', height: 'auto' }}
      >
        {copied ? 'Copied' : 'Copy Prompt'}
      </button>
      <span aria-live="polite" className="muted" style={{ fontSize: '0.875rem' }}>
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
}
