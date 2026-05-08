'use client';

import { useState } from 'react';

type Props = {
  resetAt: string | null;
  onlineCount: number;
  runtimeLabel: string;
};

export function StatusRuntimeResetPanel({ resetAt, onlineCount, runtimeLabel }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resetSnapshot() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/staff/status/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual reset from staff status diagnostics panel.' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(data?.error || 'Reset failed.'));
      setMessage('Status snapshot reset. Public status and navbar counts will refresh on the next page/API load.');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset status snapshot.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="staff-panel staff-status-reset-panel">
      <div className="section-heading">
        <span className="kicker">Public status reset</span>
        <h2>Clear stale live users</h2>
        <p>Use this when the website is still showing connected players after the game server has restarted, crashed, or lost its disconnect events.</p>
      </div>
      <dl className="metric-grid compact">
        <div><dt>Runtime</dt><dd>{runtimeLabel}</dd></div>
        <div><dt>Website roster</dt><dd>{onlineCount}</dd></div>
        <div><dt>Last manual reset</dt><dd>{resetAt ? new Date(resetAt).toLocaleString() : 'Never'}</dd></div>
      </dl>
      <div className="staff-status-reset-actions">
        <button className="button button-primary" type="button" onClick={resetSnapshot} disabled={busy}>
          <i className="fa-solid fa-rotate" aria-hidden="true" /> {busy ? 'Resetting…' : 'Reset public status'}
        </button>
        <p>This clears the website’s current roster snapshot only. New connection events will repopulate it automatically.</p>
      </div>
      {message ? <p className="notice success">{message}</p> : null}
      {error ? <p className="notice danger">{error}</p> : null}
    </article>
  );
}
