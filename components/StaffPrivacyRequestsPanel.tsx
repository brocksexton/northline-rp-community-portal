'use client';
import { useState } from 'react';
import type { PrivacyRequest, PrivacyRequestStatus } from '@/lib/privacy-shared';

type State = { requests: PrivacyRequest[]; audit: Array<{ id: string; requestId: string; action: string; actorName: string; createdAt: string; note?: string }>; stats: { pending: number; deletion: number; export: number } };
const statuses: PrivacyRequestStatus[] = ['approved', 'rejected', 'completed', 'cancelled'];

export function StaffPrivacyRequestsPanel({ initialState }: { initialState: State }) {
  const [state, setState] = useState(initialState);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  async function update(id: string, status: PrivacyRequestStatus) {
    setBusy(`${id}:${status}`);
    const response = await fetch(`/api/staff/privacy/requests/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, note: notes[id] || '' }) });
    const body = await response.json().catch(() => null);
    if (response.ok && body) setState(body);
    setBusy('');
  }
  return <section className="staff-privacy-panel">
    <div className="staff-signal-grid staff-command-signals"><article><span>Pending</span><strong>{state.stats.pending}</strong><p>Needs review</p></article><article><span>Deletion</span><strong>{state.stats.deletion}</strong><p>All time</p></article><article><span>Exports</span><strong>{state.stats.export}</strong><p>Generated</p></article></div>
    <div className="privacy-staff-note"><strong>Before completing deletion</strong><p>Confirm the SteamID, reset or delete game data where technically possible, remove website records where practical, then mark the request completed. Backups may retain deleted data for up to 14 days.</p></div>
    <div className="staff-privacy-list">{state.requests.map((request) => <article key={request.id} className={`staff-privacy-request status-${request.status}`}><div><span className="kicker">{request.type}</span><h3>{request.displayName}</h3><p>{request.steamId}</p><small>Requested {new Date(request.requestedAt).toLocaleString()}</small></div><div className="staff-privacy-status"><strong>{request.status}</strong>{request.staffNote ? <p>{request.staffNote}</p> : null}</div><label className="field"><span>Staff note</span><textarea value={notes[request.id] || ''} onChange={(e) => setNotes((current) => ({ ...current, [request.id]: e.target.value }))} placeholder="Add processing notes for the audit trail." /></label><div className="staff-privacy-actions">{statuses.map((status) => <button key={status} className="button button-soft" disabled={Boolean(busy)} onClick={() => update(request.id, status)}>{busy === `${request.id}:${status}` ? 'Saving…' : status}</button>)}</div></article>)}</div>
  </section>;
}
