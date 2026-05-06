'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import type { StatusUpdate, StatusUpdateTone } from '@/lib/community-data';

type StatusUpdatesAdminPanelProps = {
  initialUpdates: StatusUpdate[];
};

const TONES: Array<{ value: StatusUpdateTone; label: string; description: string }> = [
  { value: 'info', label: 'Info', description: 'General city note' },
  { value: 'event', label: 'Event', description: 'Community or server event' },
  { value: 'warning', label: 'Warning', description: 'Degraded service or caution' },
  { value: 'maintenance', label: 'Maintenance', description: 'Planned work or downtime' },
];

function blankForm() {
  return {
    id: '',
    title: '',
    body: '',
    tone: 'info' as StatusUpdateTone,
    accentColor: '#1d9bf0',
  };
}

function toneLabel(tone: StatusUpdateTone) {
  return TONES.find((item) => item.value === tone)?.label ?? 'Info';
}

export function StatusUpdatesAdminPanel({ initialUpdates }: StatusUpdatesAdminPanelProps) {
  const [updates, setUpdates] = useState<StatusUpdate[]>(initialUpdates);
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(() => updates.find((update) => update.id === form.id) ?? null, [updates, form.id]);

  function reset(nextNotice?: string) {
    setForm(blankForm());
    setError(null);
    setNotice(nextNotice ?? null);
  }

  function edit(update: StatusUpdate) {
    setForm({
      id: update.id,
      title: update.title,
      body: update.body,
      tone: update.tone,
      accentColor: update.accentColor || '#1d9bf0',
    });
    setError(null);
    setNotice(`Editing ${update.title}`);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        id: form.id || undefined,
        title: form.title,
        body: form.body,
        tone: form.tone,
        accentColor: form.accentColor,
      };
      const response = await fetch('/api/status/updates', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save the status update.');
      const saved = data.update as StatusUpdate;
      setUpdates((current) => {
        const exists = current.some((item) => item.id === saved.id);
        const next = exists ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
        return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
      });
      reset(form.id ? 'Status update saved.' : 'Status update posted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the status update.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(update: StatusUpdate) {
    if (!confirm(`Remove the status update “${update.title}”?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/status/updates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: update.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete the status update.');
      setUpdates((current) => current.filter((item) => item.id !== update.id));
      reset('Status update removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the status update.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="staff-status-studio" aria-label="Status update studio">
      <article className="staff-panel staff-status-composer">
        <div className="section-heading">
          <span className="kicker">Status studio</span>
          <h2>{editing ? 'Edit public notice' : 'Post a public status'}</h2>
          <p>Create, customize, and maintain notices shown on the public status page and homepage noticeboard.</p>
        </div>

        {error ? <p className="notice danger">{error}</p> : null}
        {notice ? <p className="notice success">{notice}</p> : null}

        <label className="staff-status-field">
          <span>Title</span>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={80} placeholder="Maintenance window, event notice, city alert..." />
        </label>

        <label className="staff-status-field">
          <span>Body</span>
          <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} maxLength={500} placeholder="Write the player-facing update. Keep it short and useful." />
        </label>

        <div className="staff-status-form-grid">
          <label className="staff-status-field">
            <span>Tone</span>
            <select value={form.tone} onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value as StatusUpdateTone }))}>
              {TONES.map((tone) => <option key={tone.value} value={tone.value}>{tone.label} · {tone.description}</option>)}
            </select>
          </label>
          <label className="staff-status-field">
            <span>Accent</span>
            <input type="color" value={form.accentColor} onChange={(event) => setForm((current) => ({ ...current, accentColor: event.target.value }))} />
          </label>
        </div>

        <div className="staff-status-preview" style={{ '--notice-accent': form.accentColor } as CSSProperties}>
          <span>{toneLabel(form.tone)}</span>
          <strong>{form.title || 'Status title preview'}</strong>
          <p>{form.body || 'Your public update preview will appear here before you post it.'}</p>
        </div>

        <div className="staff-status-actions">
          <button className="button button-primary" type="button" onClick={submit} disabled={busy || form.title.trim().length < 3 || form.body.trim().length < 5}>
            <i className="fa-solid fa-paper-plane" aria-hidden="true" /> {editing ? 'Save update' : 'Post status'}
          </button>
          <button className="button button-soft" type="button" onClick={() => reset()} disabled={busy}>Clear</button>
        </div>
      </article>

      <article className="staff-panel staff-status-list-panel">
        <div className="section-heading">
          <span className="kicker">Live notices</span>
          <h2>Posted statuses</h2>
          <p>Newest notices appear first. Keep this list focused so players see only what matters.</p>
        </div>
        <div className="staff-status-update-list">
          {updates.length ? updates.map((update) => (
            <div className={`staff-status-update tone-${update.tone}`} key={update.id} style={{ '--notice-accent': update.accentColor || '#1d9bf0' } as CSSProperties}>
              <div>
                <span>{toneLabel(update.tone)}</span>
                <strong>{update.title}</strong>
                <p>{update.body}</p>
                <small>Posted by {update.createdByName}</small>
              </div>
              <div className="staff-status-update-actions">
                <button type="button" onClick={() => edit(update)} disabled={busy}>Edit</button>
                <button type="button" onClick={() => remove(update)} disabled={busy}>Remove</button>
              </div>
            </div>
          )) : <p className="notice warning">No public status updates are posted yet.</p>}
        </div>
      </article>
    </section>
  );
}
