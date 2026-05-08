'use client';

import { useMemo, useState } from 'react';
import { DATA_DELETION_CONFIRMATION, type PrivacyRequest } from '@/lib/privacy-shared';

const ACKS = [
  ['gameProgressReset', 'I understand this may delete or reset my in-game character, money, inventory, progress, and saved data.'],
  ['irreversible', 'I understand deletion cannot be reversed once staff process it.'],
  ['backupRetention', 'I understand backups may still contain deleted data for up to 14 days.'],
  ['restoreNotice', 'I understand backup restores are announced through Discord and the website status page.'],
  ['limitedOperationalRetention', 'I understand Northline may keep limited moderation, security, or audit records where needed for server safety.'],
] as const;

export function ProfileDataPrivacyPanel({ requests }: { requests: PrivacyRequest[] }) {
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const [confirmation, setConfirmation] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = useMemo(() => ACKS.every(([key]) => ack[key]) && confirmation.trim() === DATA_DELETION_CONFIRMATION, [ack, confirmation]);

  async function submitDeletion() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/profile/privacy/delete-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acknowledgements: ack, confirmation, note }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not submit the request.');
      setMessage('Your deletion request was sent to staff for review. Nothing has been deleted yet.');
      setConfirmation(''); setNote(''); setAck({});
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit the request.'); }
    finally { setBusy(false); }
  }

  return (
    <section className="privacy-studio-grid">
      <article className="privacy-studio-card privacy-export-card">
        <span className="kicker">Download your data</span>
        <h2>Get a copy of your Northline data.</h2>
        <p>Download a ZIP file with account-linked information the website can gather for you, including profile settings, Steam details, Tweeter activity, forum summary, applications, daily drops, and available game/server records.</p>
        <div className="privacy-explainer-list">
          <span><i className="fa-solid fa-file-zipper" /> ZIP archive</span>
          <span><i className="fa-solid fa-user-shield" /> Only your signed-in Steam account</span>
          <span><i className="fa-solid fa-key" /> No secrets, keys, or staff-only notes</span>
        </div>
        <a className="button button-primary" href="/api/profile/privacy/export"><i className="fa-solid fa-download" /> Download my data</a>
      </article>

      <article className="privacy-studio-card privacy-delete-card">
        <span className="kicker">Request deletion</span>
        <h2>Ask staff to delete your account-linked data.</h2>
        <p>This is not instant. Staff must review it first. If processed, it may permanently reset your in-game progress with no recovery option.</p>
        <div className="privacy-warning-box"><strong>Plain-English warning</strong><p>Deletion may remove website data and game/server data. This can include your character, money, inventory, rewards, applications, Tweeter/forum records where possible, and other account-linked progress.</p></div>
        <div className="privacy-checklist">
          {ACKS.map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(ack[key])} onChange={(e) => setAck((current) => ({ ...current, [key]: e.target.checked }))} /> <span>{label}</span></label>)}
        </div>
        <label className="field studio-field privacy-confirm-field"><span>Type this exactly: <strong>{DATA_DELETION_CONFIRMATION}</strong></span><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={DATA_DELETION_CONFIRMATION} /></label>
        <label className="field studio-field"><span>Optional note to staff</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Add context if there is anything staff should know." /></label>
        <button className="button button-danger" type="button" disabled={!ready || busy} onClick={submitDeletion}><i className="fa-solid fa-triangle-exclamation" /> Send deletion request</button>
        {message ? <p className="privacy-form-message" role="status">{message}</p> : null}
      </article>

      <article className="privacy-studio-card privacy-backup-card">
        <span className="kicker">Backups</span>
        <h2>Backups can exist for up to 14 days.</h2>
        <p>Northline RP keeps limited server/provider backups for up to 14 days. Deleted live data may remain inside backup snapshots until those backups expire.</p>
        <p>If a backup must be restored, Northline will announce it through Discord and the website status page. If a restore brings back data from a completed deletion request, staff will make a reasonable effort to re-apply that request where technically possible.</p>
      </article>

      <article className="privacy-studio-card privacy-history-card">
        <span className="kicker">Request history</span>
        <h2>Your recent privacy requests</h2>
        {requests.length ? <div className="privacy-request-list">{requests.map((request) => <div key={request.id}><strong>{request.type === 'deletion' ? 'Deletion request' : 'Data export'}</strong><span>{request.status}</span><small>{new Date(request.requestedAt).toLocaleString()}</small></div>)}</div> : <p>No privacy requests yet.</p>}
      </article>
    </section>
  );
}
