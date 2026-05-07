'use client';

import { useState } from 'react';
import type { DiscordAccountLink } from '@/lib/forum-data';

type Props = { initialLink: DiscordAccountLink | null };

function formatExpiry(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'soon';
}

export function DiscordLinkPanel({ initialLink }: Props) {
  const [link, setLink] = useState(initialLink);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function generateCode() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/forum/discord-link-code', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.code) throw new Error(data.message || 'Could not generate a link code.');
      setCode(data.code);
      setExpiresAt(data.expiresAt);
      if (data.link) setLink(data.link);
      setMessage('Use this code with the Discord bot before it expires.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not generate a link code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card discord-link-panel">
      <div className="section-heading inline">
        <div>
          <span className="kicker">Discord bridge</span>
          <h2>Link your Discord account</h2>
          <p>Generate a five-minute key, then use the bot command in the Discord guild or DM the bot.</p>
        </div>
        <i className="fa-brands fa-discord" aria-hidden="true" />
      </div>

      {link ? (
        <div className="discord-link-status linked">
          <strong>Linked to {link.discordUsername}</strong>
          <span>Discord ID {link.discordUserId} · linked {new Date(link.linkedAt).toLocaleString()}</span>
        </div>
      ) : (
        <div className="discord-link-status">
          <strong>No Discord account linked yet.</strong>
          <span>Linking lets the website map your forum posts to your Discord identity.</span>
        </div>
      )}

      {code ? (
        <div className="discord-code-card">
          <span>Your temporary code</span>
          <strong>{code}</strong>
          <small>Expires at {formatExpiry(expiresAt)}. Use: <code>/link {code}</code></small>
        </div>
      ) : null}

      {message ? <p className="notice success">{message}</p> : null}

      <button className="button button-primary" type="button" onClick={generateCode} disabled={busy}>
        <i className="fa-solid fa-key" aria-hidden="true" /> {busy ? 'Generating…' : 'Generate 5-minute link key'}
      </button>
    </article>
  );
}
