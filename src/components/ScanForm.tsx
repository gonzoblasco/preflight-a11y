'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progressMsg, setProgressMsg] = useState('Loading the page');

  const messages = [
    "Loading the page",
    "Checking 60+ rules",
    "Reading with a screen reader"
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;

    setStatus('pending');
    setErrorMessage('');
    
    let msgIndex = 0;
    setProgressMsg(messages[0] ?? 'Loading the page');
    const timer = setInterval(() => {
      msgIndex++;
      setProgressMsg(messages[msgIndex % messages.length] ?? messages[0] ?? '');
    }, 2500);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'The scan failed. Try again.');
      }

      const { id } = (await res.json()) as { id: string };
      clearInterval(timer);
      router.push(`/r/${id}`);
    } catch (err: unknown) {
      clearInterval(timer);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'The scan failed. Try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="scan-form">
      <div className="input-group">
        <label htmlFor="url">Website URL</label>
        <input 
          id="url"
          type="url" 
          placeholder="example.com" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          disabled={status === 'pending'}
        />
      </div>
      <button type="submit" disabled={status === 'pending'}>
        {status === 'pending' ? 'Scanning...' : 'Scan'}
      </button>
      
      {status === 'pending' && (
        <div role="status" aria-live="polite" className="scan-status mono">
          {progressMsg}
        </div>
      )}
      
      {status === 'error' && (
        <div role="alert" className="muted" style={{ color: '#B22222', marginTop: '1rem', fontSize: '0.875rem' }}>
          {errorMessage}
        </div>
      )}
    </form>
  );
}
